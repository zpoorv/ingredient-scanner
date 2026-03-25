import * as ImagePicker from 'expo-image-picker';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../constants/colors';
import { DEFAULT_DIET_PROFILE_ID } from '../constants/dietProfiles';
import type { RootStackParamList } from '../navigation/types';
import {
  IngredientLabelOcrError,
  recognizeIngredientLabelImage,
} from '../services/ingredientLabelOcr';
import { buildResolvedProductFromOcr } from '../utils/ocrResolvedProduct';

type IngredientOcrScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'IngredientOcr'
>;

export default function IngredientOcrScreen({
  navigation,
  route,
}: IngredientOcrScreenProps) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCropEnabled, setIsCropEnabled] = useState(true);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const selectedProfileId = route.params?.profileId || DEFAULT_DIET_PROFILE_ID;

  useEffect(() => {
    if (!isFocused) {
      // Clear the preview when this screen goes to the background so we do not
      // keep a large decoded bitmap alive behind the result screen.
      setPreviewUri(null);
    }
  }, [isFocused]);

  const handleAssetUri = async (imageUri: string) => {
    setPreviewUri(imageUri);
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const ocrResult = await recognizeIngredientLabelImage(imageUri);
      const product = buildResolvedProductFromOcr(ocrResult);
      setPreviewUri(null);

      navigation.push('Result', {
        barcode: 'OCR INGREDIENT SCAN',
        persistToHistory: false,
        product,
        profileId: selectedProfileId,
        resultSource: 'ingredient-ocr',
      });
    } catch (error) {
      if (error instanceof IngredientLabelOcrError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('We could not read that label right now. Try another photo.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setErrorMessage('Camera permission is required to photograph an ingredient label.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: isCropEnabled,
      aspect: [4, 3],
      cameraType: ImagePicker.CameraType.back,
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      await handleAssetUri(result.assets[0].uri);
    }
  };

  const handleChoosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setErrorMessage('Photo access is required to import an ingredient label image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: isCropEnabled,
      aspect: [4, 3],
      mediaTypes: ['images'],
      quality: 0.8,
      selectionLimit: 1,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      await handleAssetUri(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom + 24, 32) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Ingredient Label OCR</Text>
          <Text style={styles.title}>Photograph an ingredient list</Text>
          <Text style={styles.subtitle}>
            Take a clear photo of the ingredients section, and we will extract the
            text and run the same highlighting and scoring pipeline used for barcode scans.
          </Text>
        </View>

        <View style={styles.actionCard}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsCropEnabled((value) => !value)}
            style={[
              styles.cropToggle,
              isCropEnabled && styles.cropToggleActive,
            ]}
          >
            <View style={styles.cropToggleContent}>
              <Text
                style={[
                  styles.cropToggleLabel,
                  isCropEnabled && styles.cropToggleLabelActive,
                ]}
              >
                Crop Before OCR
              </Text>
              <Text
                style={[
                  styles.cropToggleHint,
                  isCropEnabled && styles.cropToggleHintActive,
                ]}
              >
                {isCropEnabled
                  ? 'On: select just the ingredient block before scanning.'
                  : 'Off: scan the full image without cropping first.'}
              </Text>
            </View>
            <View
              style={[
                styles.cropToggleBadge,
                isCropEnabled && styles.cropToggleBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.cropToggleBadgeText,
                  isCropEnabled && styles.cropToggleBadgeTextActive,
                ]}
              >
                {isCropEnabled ? 'On' : 'Off'}
              </Text>
            </View>
          </Pressable>
          <PrimaryButton
            disabled={isProcessing}
            label={isProcessing ? 'Reading Label...' : 'Take Ingredient Photo'}
            onPress={() => void handleTakePhoto()}
          />
          <PrimaryButton
            disabled={isProcessing}
            label={isProcessing ? 'Reading Label...' : 'Choose From Gallery'}
            onPress={() => void handleChoosePhoto()}
          />
          <Text style={styles.helperText}>
            Tips: crop to the ingredient lines only, avoid blur, and keep the label flat.
          </Text>
        </View>

        {previewUri ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Selected Image</Text>
            <Image source={{ uri: previewUri }} style={styles.previewImage} />
          </View>
        ) : null}

        {isProcessing ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.stateText}>
              Extracting text and isolating the ingredient section...
            </Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>OCR needs another try</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  content: {
    gap: 18,
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  cropToggle: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cropToggleActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  cropToggleContent: {
    flex: 1,
    paddingRight: 12,
  },
  cropToggleBadge: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    minWidth: 52,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cropToggleBadgeActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cropToggleBadgeText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  cropToggleBadgeTextActive: {
    color: colors.surface,
  },
  cropToggleHint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  cropToggleHintActive: {
    color: colors.primary,
  },
  cropToggleLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  cropToggleLabelActive: {
    color: colors.primary,
  },
  errorCard: {
    backgroundColor: colors.dangerMuted,
    borderRadius: 20,
    gap: 8,
    padding: 18,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 21,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 17,
    fontWeight: '800',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  heroCard: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 24,
    gap: 10,
    padding: 20,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  previewImage: {
    backgroundColor: colors.background,
    borderRadius: 18,
    height: 220,
    width: '100%',
  },
  previewLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  stateText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 23,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
});

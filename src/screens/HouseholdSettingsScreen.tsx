import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DietProfileModal from '../components/DietProfileModal';
import FeaturePageLayout from '../components/FeaturePageLayout';
import HouseholdProfileEditorModal from '../components/HouseholdProfileEditorModal';
import HouseholdProfilesModal from '../components/HouseholdProfilesModal';
import OptionPickerModal from '../components/OptionPickerModal';
import RestrictionPickerModal from '../components/RestrictionPickerModal';
import ScreenLoadingView from '../components/ScreenLoadingView';
import SettingsRow from '../components/SettingsRow';
import SettingsSection from '../components/SettingsSection';
import { useAppTheme } from '../components/AppThemeProvider';
import {
  DEFAULT_DIET_PROFILE_ID,
  DIET_PROFILE_DEFINITIONS,
  type DietProfileId,
} from '../constants/dietProfiles';
import { RESTRICTION_DEFINITIONS } from '../constants/restrictions';
import type { HouseholdProfile } from '../models/householdProfile';
import type { RestrictionId, RestrictionSeverity } from '../models/restrictions';
import type { RootStackParamList } from '../navigation/types';
import { AuthServiceError } from '../services/authHelpers';
import { saveDietProfile, syncDietProfileForCurrentUser } from '../services/dietProfileStorage';
import {
  deleteHouseholdProfile,
  loadHouseholdProfileState,
  saveHouseholdProfile,
  setActiveHouseholdProfile,
} from '../services/householdProfilesService';
import { loadSessionUserProfile } from '../services/sessionDataService';
import { saveCurrentUserPreferences } from '../services/userProfileService';

type HouseholdSettingsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'HouseholdSettings'
>;

export default function HouseholdSettingsScreen({
  navigation,
}: HouseholdSettingsScreenProps) {
  const { colors } = useAppTheme();
  const [dietProfileId, setDietProfileId] = useState<DietProfileId>(DEFAULT_DIET_PROFILE_ID);
  const [draftDietProfileId, setDraftDietProfileId] =
    useState<DietProfileId>(DEFAULT_DIET_PROFILE_ID);
  const [restrictionIds, setRestrictionIds] = useState<RestrictionId[]>([]);
  const [draftRestrictionIds, setDraftRestrictionIds] = useState<RestrictionId[]>([]);
  const [restrictionSeverity, setRestrictionSeverity] =
    useState<RestrictionSeverity>('strict');
  const [draftRestrictionSeverity, setDraftRestrictionSeverity] =
    useState<RestrictionSeverity>('strict');
  const [householdProfiles, setHouseholdProfiles] = useState<HouseholdProfile[]>([]);
  const [activeHouseholdProfileId, setActiveHouseholdProfileId] = useState<string | null>(null);
  const [editingHouseholdProfileId, setEditingHouseholdProfileId] = useState<string | null>(null);
  const [draftHouseholdName, setDraftHouseholdName] = useState('');
  const [draftHouseholdDietProfileId, setDraftHouseholdDietProfileId] =
    useState<DietProfileId>(DEFAULT_DIET_PROFILE_ID);
  const [draftHouseholdRestrictionIds, setDraftHouseholdRestrictionIds] = useState<
    RestrictionId[]
  >([]);
  const [draftHouseholdRestrictionSeverity, setDraftHouseholdRestrictionSeverity] =
    useState<RestrictionSeverity>('strict');
  const [isDietProfileVisible, setIsDietProfileVisible] = useState(false);
  const [isHouseholdEditorVisible, setIsHouseholdEditorVisible] = useState(false);
  const [isHouseholdProfilesModalVisible, setIsHouseholdProfilesModalVisible] =
    useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestrictionModalVisible, setIsRestrictionModalVisible] = useState(false);
  const [isRestrictionSeverityModalVisible, setIsRestrictionSeverityModalVisible] =
    useState(false);

  const restrictionSeverityOptions = [
    {
      description: 'Flag products gently so you can decide case by case.',
      id: 'caution' as const,
      label: 'Caution',
    },
    {
      description: 'Treat any strong match as an avoid signal.',
      id: 'strict' as const,
      label: 'Strict',
    },
  ];

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setIsLoading(true);

      void Promise.all([
        loadSessionUserProfile('force-refresh'),
        syncDietProfileForCurrentUser(),
        loadHouseholdProfileState(),
      ])
        .then(([profile, savedDietProfileId, householdProfileState]) => {
          if (!isMounted) {
            return;
          }

          setDietProfileId(savedDietProfileId);
          setDraftDietProfileId(savedDietProfileId);
          setRestrictionIds(profile?.restrictionIds ?? []);
          setDraftRestrictionIds(profile?.restrictionIds ?? []);
          setRestrictionSeverity(profile?.restrictionSeverity ?? 'strict');
          setDraftRestrictionSeverity(profile?.restrictionSeverity ?? 'strict');
          setHouseholdProfiles(householdProfileState.householdProfiles);
          setActiveHouseholdProfileId(householdProfileState.activeHouseholdProfileId);
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }, [])
  );

  const activeHouseholdProfile =
    householdProfiles.find((profile) => profile.id === activeHouseholdProfileId) ?? null;
  const selectedProfile =
    DIET_PROFILE_DEFINITIONS.find((profile) => profile.id === dietProfileId) ??
    DIET_PROFILE_DEFINITIONS[0];

  const handleSaveHousehold = () => {
    setIsHouseholdEditorVisible(false);
    void (async () => {
      try {
        const state = await saveHouseholdProfile({
          dietProfileId: draftHouseholdDietProfileId,
          id: editingHouseholdProfileId,
          name: draftHouseholdName,
          restrictionIds: draftHouseholdRestrictionIds,
          restrictionSeverity: draftHouseholdRestrictionSeverity,
        });
        setHouseholdProfiles(state.householdProfiles);
        setActiveHouseholdProfileId(state.activeHouseholdProfileId);
        setIsHouseholdProfilesModalVisible(true);
      } catch (error) {
        Alert.alert(
          'Household profile update failed',
          error instanceof AuthServiceError
            ? error.message
            : 'We could not save that household profile right now.'
        );
      }
    })();
  };

  if (isLoading) {
    return (
      <ScreenLoadingView
        subtitle="Refreshing who you shop for, your diet profile, and food filters..."
        title="Loading household"
      />
    );
  }

  return (
    <FeaturePageLayout
      eyebrow="Household"
      subtitle="Diet profile, personal filters, and saved household shoppers now live together."
      title="Household settings"
    >
      <SettingsSection title="Shopping profile">
        <SettingsRow
          onPress={() => setIsHouseholdProfilesModalVisible(true)}
          subtitle="Switch who you are shopping for without overwriting your own defaults."
          title="Shopping For"
          value={activeHouseholdProfile?.name ?? 'You'}
        />
        <SettingsRow
          onPress={() => setIsDietProfileVisible(true)}
          subtitle="This is your default when shopping for yourself."
          title="Your Diet Profile"
          value={selectedProfile.shortLabel}
        />
        <SettingsRow
          onPress={() => setIsRestrictionModalVisible(true)}
          subtitle="These are your own default filters when no household profile is active."
          title="Your Food Filters"
          value={
            restrictionIds.length === 0
              ? 'Off'
              : `${restrictionIds.length} ${restrictionIds.length === 1 ? 'filter' : 'filters'}`
          }
        />
        <SettingsRow
          disabled={restrictionIds.length === 0}
          onPress={() => setIsRestrictionSeverityModalVisible(true)}
          subtitle="Choose whether matching products show caution or avoid."
          title="Filter Strictness"
          value={restrictionSeverity}
        />
      </SettingsSection>

      <DietProfileModal
        isFirstLaunch={false}
        onApply={() => {
          setDietProfileId(draftDietProfileId);
          setIsDietProfileVisible(false);
          void saveDietProfile(draftDietProfileId).catch((error) => {
            Alert.alert(
              'Diet profile update failed',
              error instanceof AuthServiceError
                ? error.message
                : 'We could not save that diet profile right now.'
            );
          });
        }}
        onSelect={setDraftDietProfileId}
        selectedProfileId={draftDietProfileId}
        visible={isDietProfileVisible}
      />
      <RestrictionPickerModal
        colors={colors}
        onApply={() => {
          const nextRestrictionIds = [...draftRestrictionIds].sort();
          setRestrictionIds(nextRestrictionIds);
          setIsRestrictionModalVisible(false);
          void saveCurrentUserPreferences({ restrictionIds: nextRestrictionIds }).catch((error) => {
            Alert.alert(
              'Food filters update failed',
              error instanceof AuthServiceError
                ? error.message
                : 'We could not save those food filters right now.'
            );
          });
        }}
        onRequestClose={() => setIsRestrictionModalVisible(false)}
        onToggle={(id) =>
          setDraftRestrictionIds((currentIds) =>
            currentIds.includes(id)
              ? currentIds.filter((currentId) => currentId !== id)
              : [...currentIds, id]
          )
        }
        restrictions={RESTRICTION_DEFINITIONS}
        selectedIds={draftRestrictionIds}
        visible={isRestrictionModalVisible}
      />
      <OptionPickerModal
        colors={colors}
        onApply={() => {
          setRestrictionSeverity(draftRestrictionSeverity);
          setIsRestrictionSeverityModalVisible(false);
          void saveCurrentUserPreferences({
            restrictionSeverity: draftRestrictionSeverity,
          }).catch((error) => {
            Alert.alert(
              'Filter strictness update failed',
              error instanceof AuthServiceError
                ? error.message
                : 'We could not save that filter strictness right now.'
            );
          });
        }}
        onRequestClose={() => setIsRestrictionSeverityModalVisible(false)}
        onSelect={setDraftRestrictionSeverity}
        options={restrictionSeverityOptions}
        selectedId={draftRestrictionSeverity}
        title="Choose filter strictness"
        visible={isRestrictionSeverityModalVisible}
      />
      <HouseholdProfilesModal
        activeHouseholdProfileId={activeHouseholdProfileId}
        householdProfiles={householdProfiles}
        onAdd={() => {
          setEditingHouseholdProfileId(null);
          setDraftHouseholdName('');
          setDraftHouseholdDietProfileId(dietProfileId);
          setDraftHouseholdRestrictionIds(restrictionIds);
          setDraftHouseholdRestrictionSeverity(restrictionSeverity);
          setIsHouseholdProfilesModalVisible(false);
          setIsHouseholdEditorVisible(true);
        }}
        onDelete={(id) => {
          Alert.alert('Delete household profile?', 'This removes only that saved household setup.', [
            { style: 'cancel', text: 'Cancel' },
            {
              style: 'destructive',
              text: 'Delete',
              onPress: () => {
                void deleteHouseholdProfile(id)
                  .then((state) => {
                    setHouseholdProfiles(state.householdProfiles);
                    setActiveHouseholdProfileId(state.activeHouseholdProfileId);
                  })
                  .catch((error) => {
                    Alert.alert(
                      'Delete failed',
                      error instanceof AuthServiceError
                        ? error.message
                        : 'We could not remove that household profile right now.'
                    );
                  });
              },
            },
          ]);
        }}
        onEdit={(profile) => {
          setIsHouseholdProfilesModalVisible(false);
          setEditingHouseholdProfileId(profile.id);
          setDraftHouseholdName(profile.name);
          setDraftHouseholdDietProfileId(profile.dietProfileId);
          setDraftHouseholdRestrictionIds(profile.restrictionIds);
          setDraftHouseholdRestrictionSeverity(profile.restrictionSeverity);
          setIsHouseholdEditorVisible(true);
        }}
        onRequestClose={() => setIsHouseholdProfilesModalVisible(false)}
        onUseProfile={(id) => {
          setActiveHouseholdProfileId(id);
          void setActiveHouseholdProfile(id).catch((error) => {
            Alert.alert(
              'Switch failed',
              error instanceof AuthServiceError
                ? error.message
                : 'We could not switch the active household profile right now.'
            );
          });
        }}
        visible={isHouseholdProfilesModalVisible}
      />
      <HouseholdProfileEditorModal
        draftDietProfileId={draftHouseholdDietProfileId}
        draftName={draftHouseholdName}
        draftRestrictionIds={draftHouseholdRestrictionIds}
        draftRestrictionSeverity={draftHouseholdRestrictionSeverity}
        onChangeName={setDraftHouseholdName}
        onRequestClose={() => {
          setIsHouseholdEditorVisible(false);
          setIsHouseholdProfilesModalVisible(true);
        }}
        onSave={handleSaveHousehold}
        onSelectDietProfile={setDraftHouseholdDietProfileId}
        onSelectRestrictionSeverity={setDraftHouseholdRestrictionSeverity}
        onToggleRestriction={(id) =>
          setDraftHouseholdRestrictionIds((currentIds) =>
            currentIds.includes(id)
              ? currentIds.filter((currentId) => currentId !== id)
              : [...currentIds, id]
          )
        }
        visible={isHouseholdEditorVisible}
      />
    </FeaturePageLayout>
  );
}

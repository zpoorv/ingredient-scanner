import { colors } from '../constants/colors';

export function getGradeTone(grade?: string | null) {
  switch (grade) {
    case 'A':
      return {
        backgroundColor: colors.successMuted,
        color: '#217A43',
      };
    case 'B':
      return {
        backgroundColor: '#EAF5DE',
        color: '#5E9831',
      };
    case 'C':
      return {
        backgroundColor: colors.warningMuted,
        color: '#B98716',
      };
    case 'D':
      return {
        backgroundColor: '#F9E8D9',
        color: '#CF6C1A',
      };
    case 'E':
    case 'F':
      return {
        backgroundColor: colors.dangerMuted,
        color: colors.danger,
      };
    default:
      return {
        backgroundColor: colors.background,
        color: colors.textMuted,
      };
  }
}

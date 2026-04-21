import { Platform, TextStyle } from 'react-native';

const sans = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });
const sansMedium = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' });
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

export const typography = {
  title: { fontFamily: sans, fontWeight: '800' as TextStyle['fontWeight'], letterSpacing: 0.2 },
  heading: { fontFamily: sansMedium, fontWeight: '700' as TextStyle['fontWeight'] },
  body: { fontFamily: sans, fontWeight: '500' as TextStyle['fontWeight'] },
  caption: { fontFamily: sans, fontWeight: '600' as TextStyle['fontWeight'], letterSpacing: 0.2 },
  accent: { fontFamily: serif, fontWeight: '600' as TextStyle['fontWeight'] },
};

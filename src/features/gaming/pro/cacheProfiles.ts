import AsyncStorage from '@react-native-async-storage/async-storage';
import { GamerProfile } from '../types';
const KEY='gamerhub.cachedProfiles';
export async function cacheProfiles(profiles: GamerProfile[]) { await AsyncStorage.setItem(KEY, JSON.stringify(profiles)); }
export async function readCachedProfiles(): Promise<GamerProfile[]> { const raw=await AsyncStorage.getItem(KEY); return raw?JSON.parse(raw):[]; }

import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { usePathname, useRouter } from 'expo-router';
import ms from 'milsymbol';
import { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

const INFANTRY_SIDC = '10031000001211000000000000000000';

const ALL_WHITE = {
  Civilian: 'white', Friend: 'white', Hostile: 'white',
  Neutral: 'white', Unknown: 'white', Suspect: 'white',
};

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const { svg: infantrySvg, w: infantryW, h: infantryH } = useMemo(() => {
    try {
      const symbol = new ms.Symbol(INFANTRY_SIDC, {
        size: 100,
        colorMode: 'Black',
        frameColor: { ...ALL_WHITE },
        iconColor: { ...ALL_WHITE },
      });
      const svg = symbol.asSVG();
      const { width, height } = symbol.getSize();
      const displayH = 22;
      const displayW = Math.round((width / height) * displayH);
      return { svg, w: displayW, h: displayH };
    } catch {
      return { svg: null, w: 44, h: 44 };
    }
  }, []);

  const isHome = pathname === '/' || pathname === '/index' || pathname.startsWith('/(tabs)');

  return (
    <View style={{
      width: 64,
      backgroundColor: '#000',
      alignItems: 'center',
      paddingTop: insets.top + 8,
      paddingBottom: insets.bottom + 8,
      gap: 8,
    }}>
      <TouchableOpacity
        onPress={() => router.push('/(tabs)')}
        activeOpacity={0.7}
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          backgroundColor: isHome ? '#222' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {infantrySvg && <SvgXml xml={infantrySvg} width={infantryW} height={infantryH} />}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/modal')}
        activeOpacity={0.7}
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FontAwesome6 name="circle-info" size={22} color="white" />
      </TouchableOpacity>
    </View>
  );
}

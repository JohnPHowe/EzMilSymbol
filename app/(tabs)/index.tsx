import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Domain / Sub-domain ───────────────────────────────────────────────────────

type Domain = 'Air' | 'Land' | 'Space' | 'Surface' | 'Subsurface';
type Option = { label: string; value: string };

const DOMAINS: Domain[] = ['Air', 'Land', 'Space', 'Surface', 'Subsurface'];

const SYMBOL_SETS: Record<Domain, Option[]> = {
  Air: [
    { value: '01', label: 'Air' },
    { value: '02', label: 'Air Missile' },
    { value: '45', label: 'Atmospheric (Weather)' },
  ],
  Land: [
    { value: '10', label: 'Land Unit' },
    { value: '11', label: 'Land Civilian Unit/Organization' },
    { value: '15', label: 'Land Equipment' },
    { value: '20', label: 'Land Installation' },
  ],
  Space: [
    { value: '05', label: 'Space' },
    { value: '06', label: 'Space Missile' },
    { value: '47', label: 'Meteorological Space' },
  ],
  Surface: [
    { value: '30', label: 'Sea Surface' },
  ],
  Subsurface: [
    { value: '35', label: 'Sea Subsurface' },
    { value: '36', label: 'Mine Warfare' },
    { value: '46', label: 'Oceanographic' },
  ],
};

// ── SIDC structure ────────────────────────────────────────────────────────────

type GroupDef = { label: string; length: number };
type SetDef   = { label: string; groups: GroupDef[] };

const SIDC_SETS: SetDef[] = [
  {
    label: 'Set A',
    groups: [
      { label: 'Version',               length: 2 },
      { label: 'Standard Identity',     length: 2 },
      { label: 'Symbol Set',            length: 2 },
      { label: 'Status',                length: 1 },
      { label: 'HQTFFD',               length: 1 },
      { label: 'Amplifying Descriptor', length: 2 },
    ],
  },
  {
    label: 'Set B',
    groups: [
      { label: 'Entity',            length: 2 },
      { label: 'Entity Type',       length: 2 },
      { label: 'Entity Subtype',    length: 2 },
      { label: 'Sector 1 Modifier', length: 2 },
      { label: 'Sector 2 Modifier', length: 2 },
    ],
  },
  {
    label: 'Set C',
    groups: [
      { label: 'Sector 1 CMI',   length: 1 },
      { label: 'Sector 2 CMI',   length: 1 },
      { label: 'Frame Shape',    length: 1 },
      { label: 'Reserved',       length: 4 },
      { label: 'Country/Entity', length: 3 },
    ],
  },
];

// Total character-width units across all three sets (digits + hyphens).
// Set A: 10 digits + 5 hyphens = 15
// Set B: 10 digits + 4 hyphens = 14  (+ 1 inter-set hyphen)
// Set C: 10 digits + 4 hyphens = 14  (+ 1 inter-set hyphen)
const TOTAL_CHAR_UNITS = 45;
const SIDC_PAD         = 16;
const MONO             = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const TOOLTIP_H        = 30;

type RowItem =
  | { kind: 'group'; label: string; chars: number; sidcSlice: string }
  | { kind: 'sep' };

function buildItems(sidc: string): RowItem[] {
  const items: RowItem[] = [];
  let p = 0;
  SIDC_SETS.forEach((set, si) => {
    if (si > 0) items.push({ kind: 'sep' });
    set.groups.forEach((g, gi) => {
      if (gi > 0) items.push({ kind: 'sep' });
      items.push({ kind: 'group', label: g.label, chars: g.length, sidcSlice: sidc.slice(p, p + g.length) });
      p += g.length;
    });
  });
  return items;
}

// ── SIDCDisplay ───────────────────────────────────────────────────────────────

function SIDCDisplay({ sidc }: { sidc: string }) {
  const { width } = useWindowDimensions();
  const charPx       = (width - SIDC_PAD * 2) / TOTAL_CHAR_UNITS;
  const digitFs      = Math.round(charPx * 0.85);
  const setFs        = Math.round(charPx * 0.6);

  const items = buildItems(sidc);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // x-offset (px) of each item in the digit row
  const offsets = items.reduce<number[]>((acc, item, i) => {
    const prev = i === 0 ? 0 : acc[i - 1] + (items[i - 1].kind === 'sep' ? charPx : (items[i - 1] as Extract<RowItem, { kind: 'group' }>).chars * charPx);
    return [...acc, prev];
  }, []);

  const hoveredItem  = hoveredIdx !== null ? items[hoveredIdx] : null;
  const tooltipLabel = hoveredItem?.kind === 'group' ? hoveredItem.label : null;
  const tooltipLeft  = hoveredIdx !== null ? offsets[hoveredIdx] : 0;

  return (
    <View style={{ paddingHorizontal: SIDC_PAD, paddingBottom: 12 }}>

      {/* Set label row */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {SIDC_SETS.map((set, si) => {
          const w = (set.groups.reduce((s, g) => s + g.length, 0) + set.groups.length - 1) * charPx;
          return (
            <View key={set.label} style={{ flexDirection: 'row' }}>
              {si > 0 && <View style={{ width: charPx }} />}
              <View style={{ width: w }}>
                <Text style={{ fontSize: setFs, fontWeight: '700', color: '#0a7ea4' }}>
                  {set.label}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Digit row — paddingTop reserves space for tooltip */}
      <View style={{ position: 'relative', paddingTop: TOOLTIP_H }}>

        {tooltipLabel && (
          <View style={{
            position: 'absolute', top: 0, left: tooltipLeft,
            backgroundColor: '#1F2937', borderRadius: 4,
            paddingHorizontal: 8, paddingVertical: 4, zIndex: 100,
          }}>
            <Text numberOfLines={1} style={{ color: '#fff', fontSize: 12 }}>
              {tooltipLabel}
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row' }}>
          {items.map((item, i) =>
            item.kind === 'sep'
              ? <View key={i} style={{ width: charPx }}>
                  <Text style={{ fontSize: digitFs, fontFamily: MONO, color: '#9CA3AF' }}>-</Text>
                </View>
              : <View
                  key={i}
                  style={{ width: item.chars * charPx }}
                  {...(Platform.OS === 'web' ? {
                    onMouseEnter: () => setHoveredIdx(i),
                    onMouseLeave: () => setHoveredIdx(null),
                  } : {}) as any}
                >
                  <Text style={{
                    fontSize: digitFs, fontFamily: MONO,
                    color: hoveredIdx === i ? '#0a7ea4' : '#11181C',
                  }}>
                    {item.sidcSlice}
                  </Text>
                </View>
          )}
        </View>

      </View>
    </View>
  );
}

// ── Dropdown ──────────────────────────────────────────────────────────────────

function Dropdown({
  placeholder,
  options,
  value,
  onSelect,
  zIndex = 10,
}: {
  placeholder: string;
  options: Option[];
  value: string | null;
  onSelect: (v: string) => void;
  zIndex?: number;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <View style={[styles.dropdownWrapper, { zIndex }]}>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.7}
      >
        <Text style={selected ? styles.dropdownValue : styles.dropdownPlaceholder}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={styles.dropdownChevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdownList}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.dropdownItem, opt.value === value && styles.dropdownItemSelected]}
              onPress={() => { onSelect(opt.value); setOpen(false); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropdownItemText, opt.value === value && styles.dropdownItemTextSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

const DEFAULT_SIDC = '15000000000000000000000000000000';

const CONTEXT_OPTIONS: Record<string, Option[]> = {
  real: [
    { value: '0', label: 'No, just Reality' },
    { value: '3', label: 'Yes, Restricted Target - Reality' },
    { value: '4', label: 'Yes, No-Strike Entity - Reality' },
  ],
  exercise: [
    { value: '1', label: 'No, just Exercise' },
    { value: '5', label: 'Yes, Restricted Target - Exercise' },
    { value: '6', label: 'Yes, No-Strike Entity - Exercise' },
  ],
  simulation: [
    { value: '2', label: 'No, just Simulation' },
    { value: '7', label: 'Yes, Restricted Target - Simulation' },
    { value: '8', label: 'Yes, No-Strike Entity - Simulation' },
  ],
};

function patchSIDC(sidc: string, pos: number, value: string) {
  const i = pos - 1; // pos is 1-indexed
  return sidc.slice(0, i) + value + sidc.slice(i + value.length);
}

export default function LookupScreen() {
  const [query, setQuery]         = useState('');
  const [exercise, setExercise]   = useState('--');
  const [context, setContext]     = useState<string | null>(null);
  const [domain, setDomain]       = useState<Domain | null>(null);
  const [symbolSet, setSymbolSet] = useState<string | null>(null);

  function handleExerciseSelect(v: string) {
    setExercise(v);
    setContext(null);
  }

  const sidc = useMemo(() => {
    let s = patchSIDC(DEFAULT_SIDC, 3, context ?? '0');
    s = patchSIDC(s, 5, symbolSet ?? '00');
    return s;
  }, [context, symbolSet]);

  function handleDomainSelect(d: Domain) {
    setDomain(d);
    setSymbolSet(SYMBOL_SETS[d][0].value);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.heading}>Symbol Lookup</Text>

      <SIDCDisplay sidc={sidc} />

      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.search}
          placeholder="Search by name, category, or tag…"
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionHeading}>Guided Discovery</Text>

        <Text style={styles.questionLabel}>Are you planning an exercise or simulation?</Text>
        <Dropdown
          placeholder="Select…"
          options={[
            { value: '--',         label: '--' },
            { value: 'real',       label: 'Nope, real life' },
            { value: 'exercise',   label: 'Yes, exercise' },
            { value: 'simulation', label: 'Yes, simulation' },
          ]}
          value={exercise}
          onSelect={handleExerciseSelect}
          zIndex={30}
        />

        {exercise !== '--' && (
          <>
            <Text style={styles.questionLabel}>Is this a restricted target or no-strike entity?</Text>
            <Dropdown
              placeholder="Select a context…"
              options={CONTEXT_OPTIONS[exercise]}
              value={context}
              onSelect={setContext}
              zIndex={25}
            />
          </>
        )}

        <Text style={styles.questionLabel}>Choose a domain</Text>
        <Dropdown
          placeholder="Select a domain…"
          options={DOMAINS.map(d => ({ value: d, label: d }))}
          value={domain}
          onSelect={v => handleDomainSelect(v as Domain)}
          zIndex={20}
        />

        {domain && (
          <>
            <Text style={styles.questionLabel}>Sub-Domain</Text>
            <Dropdown
              placeholder="Select a sub-domain…"
              options={SYMBOL_SETS[domain]}
              value={symbolSet}
              onSelect={setSymbolSet}
              zIndex={10}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  searchWrapper: { paddingHorizontal: 16, paddingBottom: 16 },
  search: {
    backgroundColor: '#f1f1f1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: '#000',
  },
  body: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 20,
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#687076',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dropdownWrapper: { marginBottom: 16 },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dropdownPlaceholder: { fontSize: 15, color: '#999' },
  dropdownValue:       { fontSize: 15, color: '#11181C' },
  dropdownChevron:     { fontSize: 11, color: '#687076' },
  dropdownList: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  dropdownItem:             { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  dropdownItemSelected:     { backgroundColor: '#EFF6FF' },
  dropdownItemText:         { fontSize: 15, color: '#11181C' },
  dropdownItemTextSelected: { color: '#0a7ea4', fontWeight: '600' },
});

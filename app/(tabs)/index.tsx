import { useState, useMemo } from 'react';
import { ENTITY_OPTIONS } from '@/assets/data/entityOptions';
import ms from 'milsymbol';
import { SvgXml } from 'react-native-svg';
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
      { label: 'Context',               length: 1 },
      { label: 'Standard Identity',     length: 1 },
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
// Set A: 10 digits + 6 hyphens = 16
// Set B: 10 digits + 4 hyphens = 14  (+ 1 inter-set hyphen)
// Set C: 10 digits + 4 hyphens = 14  (+ 1 inter-set hyphen)
const TOTAL_CHAR_UNITS = 46;
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

// ── SymbolPreview ─────────────────────────────────────────────────────────────

function SymbolPreview({ sidc }: { sidc: string }) {
  const { svg, naturalW, naturalH } = useMemo(() => {
    try {
      const symbol = new ms.Symbol(sidc, { size: 100 });
      const { width: naturalW, height: naturalH } = symbol.getSize();
      return { svg: symbol.asSVG(), naturalW, naturalH };
    } catch {
      return { svg: null, naturalW: 0, naturalH: 0 };
    }
  }, [sidc]);

  const MAX_W = 280, MAX_H = 200;
  const scale = naturalW && naturalH ? Math.min(MAX_W / naturalW, MAX_H / naturalH) : 1;
  const displayW = Math.round(naturalW * scale);
  const displayH = Math.round(naturalH * scale);

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
      <View style={{ width: MAX_W, height: MAX_H, justifyContent: 'center', alignItems: 'center' }}>
        {svg && <SvgXml xml={svg} width={displayW} height={displayH} />}
      </View>
    </View>
  );
}

// ── SIDCDisplay ───────────────────────────────────────────────────────────────

function SIDCDisplay({ sidc }: { sidc: string }) {
  const { width: windowWidth } = useWindowDimensions();
  const [outerWidth, setOuterWidth] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // useWindowDimensions() returns 0 during SSR (static export), so fall back to
  // a typical phone width so the math never produces negative font-sizes/widths.
  const effWidth = outerWidth > 0 ? outerWidth
                 : windowWidth > 0 ? windowWidth
                 : 375;
  const charPx  = (effWidth - SIDC_PAD * 2) / TOTAL_CHAR_UNITS;
  const digitFs = Math.max(Math.round(charPx * 0.85), 8);
  const setFs   = Math.max(Math.round(charPx * 0.6), 6);

  const items = buildItems(sidc);

  // x-offset (px) of each item in the digit row
  const offsets = items.reduce<number[]>((acc, item, i) => {
    const prev = i === 0 ? 0 : acc[i - 1] + (items[i - 1].kind === 'sep' ? charPx : (items[i - 1] as Extract<RowItem, { kind: 'group' }>).chars * charPx);
    return [...acc, prev];
  }, []);

  const hoveredItem  = hoveredIdx !== null ? items[hoveredIdx] : null;
  const tooltipLabel = hoveredItem?.kind === 'group' ? hoveredItem.label : null;
  const tooltipLeft  = hoveredIdx !== null ? offsets[hoveredIdx] : 0;

  return (
    <View
      style={{ paddingHorizontal: SIDC_PAD, paddingBottom: 12 }}
      onLayout={e => setOuterWidth(e.nativeEvent.layout.width)}
    >

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
                    title: item.label,
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

const ECHELON_OPTIONS: Record<string, Option[]> = {
  '7': [
    { value: '1', label: 'Leader Individual' },
  ],
  '1': [
    { value: '1', label: 'Team/Crew' },
    { value: '2', label: 'Squad' },
    { value: '3', label: 'Section' },
    { value: '4', label: 'Platoon/Detachment' },
    { value: '5', label: 'Company/Battery/Troop' },
    { value: '6', label: 'Battalion/Squadron' },
    { value: '7', label: 'Regiment/Group' },
    { value: '8', label: 'Brigade' },
  ],
  '2': [
    { value: '1', label: 'Division' },
    { value: '2', label: 'Corps/MEF' },
    { value: '3', label: 'Army' },
    { value: '4', label: 'Army Group/Front' },
    { value: '5', label: 'Region/Theater' },
    { value: '6', label: 'Command' },
  ],
};

const MOBILITY_SUB_OPTIONS: Record<string, Option[]> = {
  '3': [
    { value: '1', label: 'Wheeled limited cross country' },
    { value: '2', label: 'Wheeled cross country' },
    { value: '3', label: 'Tracked' },
    { value: '4', label: 'Wheeled and tracked combination' },
    { value: '5', label: 'Towed' },
    { value: '6', label: 'Rail' },
    { value: '7', label: 'Pack animals' },
  ],
  '4': [
    { value: '1', label: 'Over-snow (prime mover)' },
    { value: '2', label: 'Sled' },
  ],
  '5': [
    { value: '1', label: 'Barge' },
    { value: '2', label: 'Amphibious' },
  ],
  '6': [
    { value: '1', label: 'Short towed array' },
    { value: '2', label: 'Long towed array' },
  ],
};

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
  const [exercise, setExercise]       = useState('--');
  const [context, setContext]         = useState<string | null>(null);
  const [domain, setDomain]           = useState<Domain | null>(null);
  const [symbolSet, setSymbolSet]     = useState<string | null>(null);
  const [affiliation, setAffiliation] = useState('3');
  const [status, setStatus]           = useState('0');
  const [hqtffd, setHqtffd]           = useState('0');
  const [levelMode, setLevelMode]       = useState('0');
  const [echelonGroup, setEchelonGroup] = useState('0');
  const [echelon, setEchelon]           = useState<string | null>(null);
  const [mobility, setMobility]         = useState<string | null>(null);
  const [mobilityEchelon, setMobilityEchelon] = useState('0');
  const [entity,        setEntity]        = useState<string | null>(null);
  const [entityType,    setEntityType]    = useState<string | null>(null);
  const [entitySubtype, setEntitySubtype] = useState<string | null>(null);

  function resetAll() {
    setExercise('--');
    setContext(null);
    setDomain(null);
    setSymbolSet(null);
    setEntity(null);
    setEntityType(null);
    setEntitySubtype(null);
    setAffiliation('3');
    setStatus('0');
    setHqtffd('0');
    setLevelMode('0');
    setEchelonGroup('0');
    setEchelon(null);
    setMobility(null);
    setMobilityEchelon('0');
  }

  function handleEntitySelect(v: string) {
    setEntity(v); setEntityType(null); setEntitySubtype(null);
  }
  function handleEntityTypeSelect(v: string) {
    setEntityType(v); setEntitySubtype(null);
  }

  function handleLevelModeSelect(v: string) {
    setLevelMode(v);
    setEchelonGroup('0');
    setEchelon(null);
    setMobility(null);
    setMobilityEchelon('0');
  }

  function handleMobilitySelect(v: string) {
    setMobility(v);
    setMobilityEchelon('0');
  }

  function handleExerciseSelect(v: string) {
    setExercise(v);
    setContext(null);
  }

  const sidc = useMemo(() => {
    let s = patchSIDC(DEFAULT_SIDC, 3, context ?? '0');
    s = patchSIDC(s, 4, affiliation ?? '3');
    s = patchSIDC(s, 5, symbolSet ?? '00');
    s = patchSIDC(s, 7, status ?? '0');
    s = patchSIDC(s, 8, hqtffd);
    const digit9 = levelMode === '1' ? echelonGroup
                 : levelMode === '2' ? (mobility ?? '0')
                 : '0';
    s = patchSIDC(s, 9, digit9);
    s = patchSIDC(s, 10, levelMode === '2' ? mobilityEchelon : (echelon ?? '0'));
    s = patchSIDC(s, 11, entity       ?? '00');
    s = patchSIDC(s, 13, entityType   ?? '00');
    s = patchSIDC(s, 15, entitySubtype ?? '00');
    return s;
  }, [context, affiliation, symbolSet, status, hqtffd, levelMode, echelonGroup, echelon, mobility, mobilityEchelon, entity, entityType, entitySubtype]);

  function handleDomainSelect(d: Domain) {
    setDomain(d);
    setSymbolSet(SYMBOL_SETS[d][0].value);
    setEntity(null);
    setEntityType(null);
    setEntitySubtype(null);
  }

  const entityData    = symbolSet !== null ? (ENTITY_OPTIONS[symbolSet] ?? null) : null;
  const entityDef     = entity !== null && entityData !== null ? (entityData.find(e => e.value === entity) ?? null) : null;
  const entityTypeDef = entityType !== null && entityDef !== null ? (entityDef.types.find(t => t.value === entityType) ?? null) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.heading}>Symbol Lookup</Text>

      <SymbolPreview sidc={sidc} />

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
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionHeading}>Guided Discovery</Text>
          <TouchableOpacity onPress={resetAll} style={styles.resetButton} activeOpacity={0.6}>
            <Text style={styles.resetIcon}>↺</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.questionLabel}>Q1  What domain are you in?</Text>
        <Dropdown
          placeholder="Select a domain…"
          options={DOMAINS.map(d => ({ value: d, label: d }))}
          value={domain}
          onSelect={v => handleDomainSelect(v as Domain)}
          zIndex={20}
        />

        {domain && (
          <>
            <Text style={styles.questionLabel}>Q2  Most domains have subsets. Which one do you want to use?</Text>
            <Dropdown
              placeholder="Select a sub-domain…"
              options={SYMBOL_SETS[domain]}
              value={symbolSet}
              onSelect={setSymbolSet}
              zIndex={10}
            />
          </>
        )}

        {symbolSet !== null && (
          <>
            <Text style={styles.questionLabel}>Q3  What is the entity?</Text>
            {entityData ? (
              <Dropdown
                placeholder="Select an entity…"
                options={entityData.map(e => ({ value: e.value, label: e.label }))}
                value={entity}
                onSelect={handleEntitySelect}
                zIndex={18}
              />
            ) : (
              <View style={styles.placeholderDropdown}>
                <Text style={styles.placeholderText}>Entity data not yet available for this symbol set</Text>
              </View>
            )}

            {entityDef && entityDef.types.length > 0 && (
              <>
                <Text style={styles.questionLabel}>Q4  What type of {entityDef.label}?</Text>
                <Dropdown
                  placeholder="Select a type…"
                  options={entityDef.types.map(t => ({ value: t.value, label: t.label }))}
                  value={entityType}
                  onSelect={handleEntityTypeSelect}
                  zIndex={17}
                />

                {entityTypeDef && entityTypeDef.subtypes.length > 0 && (
                  <>
                    <Text style={styles.questionLabel}>Q5  What subtype?</Text>
                    <Dropdown
                      placeholder="Select a subtype…"
                      options={entityTypeDef.subtypes}
                      value={entitySubtype}
                      onSelect={setEntitySubtype}
                      zIndex={16}
                    />
                  </>
                )}
              </>
            )}
          </>
        )}

        <Text style={styles.questionLabel}>Q6  What is the affiliation?</Text>
        <Dropdown
          placeholder="Select an affiliation…"
          options={[
            { value: '0', label: 'Pending' },
            { value: '1', label: 'Unknown' },
            { value: '2', label: 'Assumed Friend' },
            { value: '3', label: 'Friend' },
            { value: '4', label: 'Neutral' },
            { value: '5', label: 'Suspect/Joker' },
            { value: '6', label: 'Hostile/Faker' },
          ]}
          value={affiliation}
          onSelect={setAffiliation}
          zIndex={5}
        />

        <Text style={styles.questionLabel}>Q7  What is your status?</Text>
        <Dropdown
          placeholder="Select a status…"
          options={[
            { value: '0', label: 'Present' },
            { value: '1', label: 'Planned/Anticipated/Suspect' },
            { value: '2', label: 'Present/Fully Capable' },
            { value: '3', label: 'Present/Damaged' },
            { value: '4', label: 'Present/Destroyed' },
            { value: '5', label: 'Present/Full to Capacity' },
          ]}
          value={status}
          onSelect={setStatus}
          zIndex={4}
        />

        <Text style={styles.questionLabel}>Q8  Is this a headquarters, task force, feint, or dummy?</Text>
        <Dropdown
          placeholder="Select…"
          options={[
            { value: '0', label: 'Unknown' },
            { value: '1', label: 'Feint/Decoy/Dummy' },
            { value: '2', label: 'Headquarters' },
            { value: '3', label: 'Feint/Dummy Headquarters' },
            { value: '4', label: 'Task Force' },
            { value: '5', label: 'Feint/Dummy Task Force' },
            { value: '6', label: 'Task Force Headquarters' },
            { value: '7', label: 'Feint/Dummy Task Force Headquarters' },
          ]}
          value={hqtffd}
          onSelect={setHqtffd}
          zIndex={3}
        />

        <Text style={styles.questionLabel}>Q9  Do you need to set a leadership level or define mobility status?</Text>
        <Dropdown
          placeholder="Select…"
          options={[
            { value: '0', label: 'No' },
            { value: '1', label: "Yes, I'm stationary and need to set a leadership level" },
            { value: '2', label: "Yes, I'm mobile equipment" },
          ]}
          value={levelMode}
          onSelect={handleLevelModeSelect}
          zIndex={3}
        />

        {levelMode === '1' && (
          <>
            <Text style={styles.questionLabel}>Q10  What is your leadership level?</Text>
            <Dropdown
              placeholder="Select…"
              options={[
                { value: '0', label: 'Unknown' },
                { value: '1', label: 'Brigade and below' },
                { value: '2', label: 'Division and above' },
                { value: '7', label: 'Individual Leader' },
              ]}
              value={echelonGroup}
              onSelect={v => { setEchelonGroup(v); setEchelon(null); }}
              zIndex={2}
            />

            {echelonGroup !== '0' && (
              <>
                <Text style={styles.questionLabel}>Q11  Echelon Options</Text>
                <Dropdown
                  placeholder="Select an echelon…"
                  options={ECHELON_OPTIONS[echelonGroup] ?? []}
                  value={echelon}
                  onSelect={setEchelon}
                  zIndex={1}
                />
              </>
            )}
          </>
        )}

        {levelMode === '2' && (
          <>
            <Text style={styles.questionLabel}>Q12  What kind of mobile equipment?</Text>
            <Dropdown
              placeholder="Select…"
              options={[
                { value: '3', label: 'Mobile equipment on land' },
                { value: '4', label: 'Mobile equipment on snow' },
                { value: '5', label: 'Mobile equipment on water' },
                { value: '6', label: 'Naval towed array' },
              ]}
              value={mobility}
              onSelect={handleMobilitySelect}
              zIndex={2}
            />

            {mobility !== null && (
              <>
                <Text style={styles.questionLabel}>Q13  Which type?</Text>
                <Dropdown
                  placeholder="Select…"
                  options={MOBILITY_SUB_OPTIONS[mobility] ?? []}
                  value={mobilityEchelon}
                  onSelect={setMobilityEchelon}
                  zIndex={1}
                />
              </>
            )}
          </>
        )}

        <Text style={styles.questionLabel}>Q14  Are you planning an exercise or simulation?</Text>
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
          zIndex={4}
        />

        {exercise !== '--' && (
          <>
            <Text style={styles.questionLabel}>Q15  Is this a restricted target or no-strike entity?</Text>
            <Dropdown
              placeholder="Select a context…"
              options={CONTEXT_OPTIONS[exercise]}
              value={context}
              onSelect={setContext}
              zIndex={3}
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
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
  },
  resetButton: { padding: 4, marginLeft: 20 },
  resetIcon: { fontSize: 22, color: '#0a7ea4', lineHeight: 26 },
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
  placeholderDropdown: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#F9FAFB', marginBottom: 16,
  },
  placeholderText: { fontSize: 15, color: '#9CA3AF', fontStyle: 'italic' },
  dropdownItem:             { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  dropdownItemSelected:     { backgroundColor: '#EFF6FF' },
  dropdownItemText:         { fontSize: 15, color: '#11181C' },
  dropdownItemTextSelected: { color: '#0a7ea4', fontWeight: '600' },
});

import { ENTITY_OPTIONS, type EntityDef, type EntityType } from '@/assets/data/entityOptions';
import { MODIFIER1_OPTIONS, MODIFIER2_OPTIONS } from '@/assets/data/modifierOptions';
import Fuse from 'fuse.js';
import ms from 'milsymbol';
import { Fragment, useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

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

const SIDC_PAD = 16;
const MONO     = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const DIGIT_FS = 26;
const SET_FS   = 22;

// Flex units per set: digit chars + intra-set separators
const SET_FLEX = SIDC_SETS.map(set =>
  set.groups.reduce((s, g) => s + g.length, 0) + (set.groups.length - 1)
);

// SIDC char start position for each [set][group], computed once from SIDC_SETS
const GROUP_STARTS: number[][] = (() => {
  let pos = 0;
  return SIDC_SETS.map(set =>
    set.groups.map(g => { const s = pos; pos += g.length; return s; })
  );
})();

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

// ── AffiliationPicker ─────────────────────────────────────────────────────────

const AFFILIATION_OPTIONS: Option[] = [
  { value: '0', label: 'Pending' },
  { value: '1', label: 'Unknown' },
  { value: '2', label: 'Assumed Friend' },
  { value: '3', label: 'Friend' },
  { value: '4', label: 'Neutral' },
  { value: '5', label: 'Suspect/Joker' },
  { value: '6', label: 'Hostile/Faker' },
];

function AffiliationTile({
  label,
  sidc,
  selected,
  onPress,
}: {
  label: string;
  sidc: string;
  selected: boolean;
  onPress: () => void;
}) {
  const svg = useMemo(() => {
    try {
      return new ms.Symbol(sidc, { size: 64 }).asSVG();
    } catch {
      return null;
    }
  }, [sidc]);

  return (
    <TouchableOpacity
      style={[styles.affiliationTile, selected && styles.affiliationTileSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.affiliationIconWrap}>
        {svg && <SvgXml xml={svg} width={84} height={84} />}
      </View>
      <Text style={styles.affiliationLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function AffiliationPicker({
  baseSidc,
  affiliation,
  onSelect,
}: {
  baseSidc: string;
  affiliation: string;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={styles.affiliationWrapper}>
      <Text style={styles.affiliationHeading}>Affiliation</Text>
      <View style={styles.affiliationRow}>
        {AFFILIATION_OPTIONS.map(opt => (
          <AffiliationTile
            key={opt.value}
            label={opt.label}
            sidc={patchSIDC(baseSidc, 4, opt.value)}
            selected={affiliation === opt.value}
            onPress={() => onSelect(opt.value)}
          />
        ))}
      </View>
    </View>
  );
}

// ── SIDCDisplay ───────────────────────────────────────────────────────────────

// Flat ordered list of items for the digit row (built once from SIDC_SETS)
type FlatItem =
  | { kind: 'sep' }
  | { kind: 'group'; si: number; gi: number; flex: number; start: number; length: number; label: string };

const FLAT_ITEMS: FlatItem[] = (() => {
  const items: FlatItem[] = [];
  SIDC_SETS.forEach((set, si) => {
    if (si > 0) items.push({ kind: 'sep' });
    set.groups.forEach((g, gi) => {
      if (gi > 0) items.push({ kind: 'sep' });
      items.push({ kind: 'group', si, gi, flex: g.length, start: GROUP_STARTS[si][gi], length: g.length, label: g.label });
    });
  });
  return items;
})();

function SIDCDisplay({ sidc }: { sidc: string }) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [groupX, setGroupX] = useState<Record<string, number>>({});

  let tooltipLabel: string | null = null;
  let tooltipLeft = 0;
  if (hoveredKey) {
    const [si, gi] = hoveredKey.split('-').map(Number);
    tooltipLabel = SIDC_SETS[si]?.groups[gi]?.label ?? null;
    tooltipLeft  = groupX[hoveredKey] ?? 0;
  }

  return (
    <View style={{ paddingHorizontal: SIDC_PAD, paddingBottom: 12 }}>
      {/* Set label row */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {SIDC_SETS.map((set, si) => (
          <Fragment key={set.label}>
            {si > 0 && <View style={{ flex: 1 }} />}
            <View style={{ flex: SET_FLEX[si] }}>
              <Text style={{ fontSize: SET_FS, fontWeight: '700', color: '#0a7ea4' }}>
                {set.label}
              </Text>
            </View>
          </Fragment>
        ))}
      </View>

      {/* Digit row — paddingTop reserves space for tooltip */}
      <View style={{ position: 'relative', paddingTop: 30 }}>
        {tooltipLabel && (
          <View style={{
            position: 'absolute', top: 0, left: tooltipLeft,
            backgroundColor: '#1F2937', borderRadius: 4,
            paddingHorizontal: 8, paddingVertical: 4, zIndex: 100,
          }}>
            <Text numberOfLines={1} style={{ color: '#fff', fontSize: 12 }}>{tooltipLabel}</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row' }}>
          {FLAT_ITEMS.map((item, i) =>
            item.kind === 'sep' ? (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: MONO, fontSize: DIGIT_FS, color: '#9CA3AF' }}>-</Text>
              </View>
            ) : (
              <View
                key={`${item.si}-${item.gi}`}
                style={{ flex: item.flex }}
                onLayout={e => {
                  const x = e.nativeEvent.layout.x;
                  setGroupX(prev => prev[`${item.si}-${item.gi}`] === x ? prev : { ...prev, [`${item.si}-${item.gi}`]: x });
                }}
                {...(Platform.OS === 'web' ? {
                  onMouseEnter: () => setHoveredKey(`${item.si}-${item.gi}`),
                  onMouseLeave: () => setHoveredKey(null),
                } : {}) as any}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: MONO,
                    fontSize: DIGIT_FS,
                    color: hoveredKey === `${item.si}-${item.gi}` ? '#0a7ea4' : '#11181C',
                  }}
                >
                  {sidc.slice(item.start, item.start + item.length)}
                </Text>
              </View>
            )
          )}
        </View>
      </View>
    </View>
  );
}

// ── EntityTypeGrid ────────────────────────────────────────────────────────────

function QuestionMarkTile({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tile, selected && styles.tileSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.tileIconWrap}>
        <Text style={styles.breadcrumbIconGlyph}>?</Text>
      </View>
      <Text style={styles.tileLabel} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

function EntityTypeTile({
  label,
  sidc,
  selected,
  onPress,
}: {
  label: string;
  sidc: string;
  selected: boolean;
  onPress: () => void;
}) {
  const svg = useMemo(() => {
    try {
      return new ms.Symbol(sidc, { size: 30 }).asSVG();
    } catch {
      return null;
    }
  }, [sidc]);

  return (
    <TouchableOpacity
      style={[styles.tile, selected && styles.tileSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.tileIconWrap}>
        {svg && <SvgXml xml={svg} width={40} height={40} />}
      </View>
      <Text style={styles.tileLabel} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

function EntityTypeGrid({
  entityData,
  baseSidc,
  currentSidc,
  selectedEntity,
  selectedType,
  selectedSubtype,
  selectedTypeDef,
  onSelect,
  onSelectSubtype,
}: {
  entityData: EntityDef[];
  baseSidc: string;
  currentSidc: string;
  selectedEntity: string | null;
  selectedType: string | null;
  selectedSubtype: string | null;
  selectedTypeDef: EntityType | null;
  onSelect: (entity: string, type: string) => void;
  onSelectSubtype: (subtype: string) => void;
}) {
  function tileSidc(entityVal: string, typeVal: string, subtypeVal = '00') {
    let s = patchSIDC(baseSidc, 11, entityVal);
    s = patchSIDC(s, 13, typeVal);
    s = patchSIDC(s, 15, subtypeVal);
    s = patchSIDC(s, 17, '00');
    s = patchSIDC(s, 19, '00');
    return s;
  }

  // Once a type with subtypes is selected, narrow the grid to that type's subtypes (Q5).
  if (selectedEntity && selectedType && selectedTypeDef && selectedTypeDef.subtypes.length > 0) {
    return (
      <View>
        <View style={styles.gridSection}>
          <Text style={styles.gridCategoryHeading}>{selectedTypeDef.label}</Text>
          <View style={styles.gridRow}>
            <EntityTypeTile
              label="None"
              sidc={selectedSubtype === null ? currentSidc : tileSidc(selectedEntity, selectedType, '00')}
              selected={selectedSubtype === null}
              onPress={() => onSelectSubtype('00')}
            />
            {selectedTypeDef.subtypes.map(subtype => {
              const isSelected = selectedSubtype === subtype.value;
              return (
                <EntityTypeTile
                  key={subtype.value}
                  label={subtype.label}
                  sidc={isSelected ? currentSidc : tileSidc(selectedEntity, selectedType, subtype.value)}
                  selected={isSelected}
                  onPress={() => onSelectSubtype(subtype.value)}
                />
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View>
      {entityData.map(category => (
        <View key={category.value} style={styles.gridSection}>
          <Text style={styles.gridCategoryHeading}>{category.label}</Text>
          <View style={styles.gridRow}>
            {category.types.length === 0 ? (
              <EntityTypeTile
                label={category.label}
                sidc={selectedEntity === category.value ? currentSidc : tileSidc(category.value, '00')}
                selected={selectedEntity === category.value}
                onPress={() => onSelect(category.value, '00')}
              />
            ) : (
              category.types.map(type => {
                const isSelected = selectedEntity === category.value && selectedType === type.value;
                return (
                  <EntityTypeTile
                    key={type.value}
                    label={type.label}
                    sidc={isSelected ? currentSidc : tileSidc(category.value, type.value)}
                    selected={isSelected}
                    onPress={() => onSelect(category.value, type.value)}
                  />
                );
              })
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Breadcrumbs ───────────────────────────────────────────────────────────────

type BreadcrumbStep = {
  step: number;
  label: string;
  display: string | null;
  placeholder: string;
  value: string | null;
  options: Option[];
  onSelect: (v: string) => void;
};

function Breadcrumbs({
  steps,
  openStep,
  onToggle,
}: {
  steps: BreadcrumbStep[];
  openStep: number | null;
  onToggle: (step: number) => void;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={styles.breadcrumbRow}>
        {steps.map((s, i) => (
          <Fragment key={s.step}>
            {i > 0 && <Text style={styles.breadcrumbSep}>›</Text>}
            <TouchableOpacity onPress={() => onToggle(s.step)} activeOpacity={0.7}>
              <Text style={[
                styles.breadcrumbItem,
                s.value && styles.breadcrumbItemAnswered,
                openStep === s.step && styles.breadcrumbItemActive,
              ]}>
                {s.display ?? s.placeholder}
              </Text>
            </TouchableOpacity>
          </Fragment>
        ))}
      </View>
    </View>
  );
}

// ── QuestionLabel ─────────────────────────────────────────────────────────────

function QuestionLabel({ label, onReset }: { label: string; onReset: () => void }) {
  return (
    <View style={styles.questionLabelRow}>
      <Text style={styles.questionLabel}>{label}</Text>
      <TouchableOpacity onPress={onReset} activeOpacity={0.6} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.questionResetIcon}>↺</Text>
      </TouchableOpacity>
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
  const sorted = useMemo(
    () => [...options].sort((a, b) => a.label.localeCompare(b.label)),
    [options]
  );
  const selected = sorted.find(o => o.value === value);

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
          {sorted.map(opt => (
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

// ── Search index ──────────────────────────────────────────────────────────────
// Flattens the whole Domain → Sub-domain → Entity → Type → Subtype tree into one
// searchable list, so the search bar can jump straight to any node.

type SearchResult = {
  key: string;
  domain: Domain;
  symbolSet: string;
  symbolSetLabel: string;
  entity: string;
  entityType: string | null;
  entitySubtype: string | null;
  pathLabel: string;
  leafLabel: string;
  sidc: string;
};

function buildSearchSidc(symbolSet: string, entity: string, type: string, subtype: string) {
  let s = patchSIDC(DEFAULT_SIDC, 5, symbolSet);
  s = patchSIDC(s, 11, entity);
  s = patchSIDC(s, 13, type);
  s = patchSIDC(s, 15, subtype);
  return s;
}

const SEARCH_INDEX: SearchResult[] = (() => {
  const items: SearchResult[] = [];
  DOMAINS.forEach(domain => {
    SYMBOL_SETS[domain].forEach(set => {
      const entityDefs = ENTITY_OPTIONS[set.value];
      if (!entityDefs) return;
      entityDefs.forEach(e => {
        const entityPath = `${domain} › ${set.label} › ${e.label}`;
        items.push({
          key: `${set.value}-${e.value}`,
          domain, symbolSet: set.value, symbolSetLabel: set.label,
          entity: e.value, entityType: null, entitySubtype: null,
          pathLabel: entityPath, leafLabel: e.label,
          sidc: buildSearchSidc(set.value, e.value, '00', '00'),
        });
        e.types.forEach(t => {
          const typePath = `${entityPath} › ${t.label}`;
          items.push({
            key: `${set.value}-${e.value}-${t.value}`,
            domain, symbolSet: set.value, symbolSetLabel: set.label,
            entity: e.value, entityType: t.value, entitySubtype: null,
            pathLabel: typePath, leafLabel: t.label,
            sidc: buildSearchSidc(set.value, e.value, t.value, '00'),
          });
          t.subtypes.forEach(st => {
            const subtypePath = `${typePath} › ${st.label}`;
            items.push({
              key: `${set.value}-${e.value}-${t.value}-${st.value}`,
              domain, symbolSet: set.value, symbolSetLabel: set.label,
              entity: e.value, entityType: t.value, entitySubtype: st.value,
              pathLabel: subtypePath, leafLabel: st.label,
              sidc: buildSearchSidc(set.value, e.value, t.value, st.value),
            });
          });
        });
      });
    });
  });
  return items;
})();

const SEARCH_FUSE = new Fuse(SEARCH_INDEX, {
  keys: [
    { name: 'leafLabel', weight: 0.6 },
    { name: 'pathLabel', weight: 0.4 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
});

// ── SearchResultRow ───────────────────────────────────────────────────────────

function SearchResultRow({ result, affiliation, onPress }: { result: SearchResult; affiliation: string; onPress: () => void }) {
  const svg = useMemo(() => {
    try {
      return new ms.Symbol(patchSIDC(result.sidc, 4, affiliation), { size: 20 }).asSVG();
    } catch {
      return null;
    }
  }, [result.sidc, affiliation]);

  return (
    <TouchableOpacity style={styles.searchResultRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.searchResultIconWrap}>
        {svg && <SvgXml xml={svg} width={28} height={28} />}
      </View>
      <Text style={styles.searchResultLabel} numberOfLines={1}>{result.pathLabel}</Text>
    </TouchableOpacity>
  );
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
  const [modifier1, setModifier1] = useState<string | null>(null);
  const [modifier2, setModifier2] = useState<string | null>(null);
  const [openStep, setOpenStep]   = useState<number | null>(1);

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
    setModifier1(null);
    setModifier2(null);
    setOpenStep(1);
  }

  function handleEntitySelect(v: string) {
    setEntity(v); setEntityType(null); setEntitySubtype(null);
  }
  function handleEntityTypeSelect(v: string) {
    setEntityType(v); setEntitySubtype(null);
  }

  function handleBreadcrumbToggle(step: number) {
    setOpenStep(prev => prev === step ? null : step);
    if (step === 0) {
      setDomain(null); setSymbolSet(null); setEntity(null); setEntityType(null); setEntitySubtype(null);
      setModifier1(null); setModifier2(null);
    } else if (step === 1) {
      setSymbolSet(null); setEntity(null); setEntityType(null); setEntitySubtype(null);
      setModifier1(null); setModifier2(null);
    } else if (step === 2) {
      setEntity(null); setEntityType(null); setEntitySubtype(null);
      setModifier1(null); setModifier2(null);
    } else if (step === 3) {
      setEntityType(null); setEntitySubtype(null);
    } else if (step === 4) {
      setEntitySubtype(null);
    }
  }

  function handleSearchSelect(result: SearchResult) {
    setDomain(result.domain);
    setSymbolSet(result.symbolSet);
    setEntity(result.entity);
    setEntityType(result.entityType);
    setEntitySubtype(result.entitySubtype);
    setModifier1(null);
    setModifier2(null);
    setOpenStep(null);
    setQuery('');
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
    s = patchSIDC(s, 17, modifier1 ?? '00');
    s = patchSIDC(s, 19, modifier2 ?? '00');
    return s;
  }, [context, affiliation, symbolSet, status, hqtffd, levelMode, echelonGroup, echelon, mobility, mobilityEchelon, entity, entityType, entitySubtype, modifier1, modifier2]);

  function handleDomainSelect(d: Domain) {
    setDomain(d);
    setSymbolSet(null);
    setEntity(null);
    setEntityType(null);
    setEntitySubtype(null);
    setModifier1(null);
    setModifier2(null);
  }

  const symbolSetLabel = domain && symbolSet ? (SYMBOL_SETS[domain].find(o => o.value === symbolSet)?.label ?? symbolSet) : null;
  const entityData    = symbolSet !== null ? (ENTITY_OPTIONS[symbolSet] ?? null) : null;
  const entityDef     = entity !== null && entityData !== null ? (entityData.find(e => e.value === entity) ?? null) : null;
  const entityTypeDef = entityType !== null && entityDef !== null ? (entityDef.types.find(t => t.value === entityType) ?? null) : null;

  const searchResults = useMemo(
    () => query.trim().length > 0 ? SEARCH_FUSE.search(query.trim()).slice(0, 20).map(r => r.item) : [],
    [query]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.heading}>Symbol Lookup</Text>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <SymbolPreview sidc={sidc} />
            <TouchableOpacity onPress={resetAll} style={styles.resetButton} activeOpacity={0.6}>
              <Text style={styles.resetIcon}>Reset ↺</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.topDivider} />

        <AffiliationPicker baseSidc={sidc} affiliation={affiliation} onSelect={setAffiliation} />
      </View>

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

        {query.trim().length > 0 && (
          <View style={styles.searchResultsPanel}>
            {searchResults.length === 0 ? (
              <View style={styles.placeholderDropdown}>
                <Text style={styles.placeholderText}>No matches</Text>
              </View>
            ) : (
              searchResults.map(result => (
                <SearchResultRow
                  key={result.key}
                  result={result}
                  affiliation={affiliation}
                  onPress={() => handleSearchSelect(result)}
                />
              ))
            )}
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={[styles.sectionHeading, { marginBottom: 16 }]}>Entity Discovery</Text>
          <Breadcrumbs
            openStep={openStep}
            onToggle={handleBreadcrumbToggle}
            steps={[
              {
                step: 0,
                label: 'Domain',
                display: 'Domain',
                placeholder: 'Domain',
                value: 'root',
                options: [],
                onSelect: () => {},
              },
              {
                step: 1,
                label: 'Domain',
                display: domain,
                placeholder: 'Select a domain…',
                value: domain,
                options: DOMAINS.map(d => ({ value: d, label: d })),
                onSelect: v => { handleDomainSelect(v as Domain); setOpenStep(2); },
              },
              ...(domain ? [{
                step: 2,
                label: 'Sub-domain',
                display: symbolSetLabel,
                placeholder: 'Select a sub-domain…',
                value: symbolSet,
                options: SYMBOL_SETS[domain],
                onSelect: (v: string) => {
                  setSymbolSet(v); setEntity(null); setEntityType(null); setEntitySubtype(null);
                  setModifier1(null); setModifier2(null); setOpenStep(3);
                },
              }] : []),
              ...(symbolSet !== null ? [{
                step: 3,
                label: 'Entity',
                display: entityDef?.label ?? null,
                placeholder: 'Select an entity…',
                value: entity,
                options: entityData ? entityData.map(e => ({ value: e.value, label: e.label })) : [],
                onSelect: (v: string) => {
                  handleEntitySelect(v);
                  const def = entityData?.find(e => e.value === v);
                  setOpenStep(def && def.types.length > 0 ? 4 : null);
                },
              }] : []),
              ...(entityDef && entityDef.types.length > 0 ? [{
                step: 4,
                label: 'Type',
                display: entityTypeDef?.label ?? null,
                placeholder: 'Select a type…',
                value: entityType,
                options: entityDef.types.map(t => ({ value: t.value, label: t.label })),
                onSelect: (v: string) => {
                  handleEntityTypeSelect(v);
                  const t = entityDef.types.find(t => t.value === v);
                  setOpenStep(t && t.subtypes.length > 0 ? 5 : null);
                },
              }] : []),
              ...(entityTypeDef && entityTypeDef.subtypes.length > 0 ? [{
                step: 5,
                label: 'Subtype',
                display: entityTypeDef.subtypes.find(s => s.value === entitySubtype)?.label ?? null,
                placeholder: 'Select a subtype…',
                value: entitySubtype,
                options: entityTypeDef.subtypes,
                onSelect: (v: string) => { setEntitySubtype(v); setOpenStep(null); },
              }] : []),
            ]}
          />

          {domain === null && (
            <View style={styles.gridSection}>
              <View style={styles.gridRow}>
                {DOMAINS.map(d => (
                  <QuestionMarkTile
                    key={d}
                    label={d}
                    selected={false}
                    onPress={() => { handleDomainSelect(d); setOpenStep(2); }}
                  />
                ))}
              </View>
            </View>
          )}

          {domain && symbolSet === null && (
            <View style={styles.gridSection}>
              <View style={styles.gridRow}>
                {SYMBOL_SETS[domain].map(opt => (
                  <EntityTypeTile
                    key={opt.value}
                    label={opt.label}
                    sidc={patchSIDC(sidc, 5, opt.value)}
                    selected={false}
                    onPress={() => { setSymbolSet(opt.value); setOpenStep(3); }}
                  />
                ))}
              </View>
            </View>
          )}

          {entityData && entityData.length > 0 && (
            <EntityTypeGrid
              entityData={entityDef ? [entityDef] : entityData}
              baseSidc={sidc}
              currentSidc={sidc}
              selectedEntity={entity}
              selectedType={entityType}
              selectedSubtype={entitySubtype}
              selectedTypeDef={entityTypeDef}
              onSelect={(entityVal, typeVal) => {
                setEntity(entityVal);
                setEntityType(typeVal);
                setEntitySubtype(null);
                const def = entityData?.find(e => e.value === entityVal);
                const type = def?.types.find(t => t.value === typeVal);
                setOpenStep(type && type.subtypes.length > 0 ? 5 : null);
              }}
              onSelectSubtype={v => {
                setEntitySubtype(v === '00' ? null : v);
                setOpenStep(null);
              }}
            />
          )}
        </View>

        <View style={styles.gridWrapper}>
          <Text style={[styles.sectionHeading, { marginBottom: 16 }]}>Other Modifiers</Text>
          <View style={{ flexDirection: 'row', gap: 24 }}>
          <View style={{ flex: 1 }}>
          <QuestionLabel label="Q6  What is the affiliation?" onReset={() => setAffiliation('3')} />
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

          <QuestionLabel label="Q7  What is your status?" onReset={() => setStatus('0')} />
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

          <QuestionLabel label="Q8  Is this a headquarters, task force, feint, or dummy?" onReset={() => setHqtffd('0')} />
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

          <QuestionLabel label="Q11  Do you need to set a leadership level or define mobility status?" onReset={() => handleLevelModeSelect('0')} />
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
              <QuestionLabel label="Q12  What is your leadership level?" onReset={() => { setEchelonGroup('0'); setEchelon(null); }} />
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
                  <QuestionLabel label="Q13  Echelon Options" onReset={() => setEchelon(null)} />
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
              <QuestionLabel label="Q14  What kind of mobile equipment?" onReset={() => { setMobility(null); setMobilityEchelon('0'); }} />
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
                  <QuestionLabel label="Q15  Which type?" onReset={() => setMobilityEchelon('0')} />
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

          <QuestionLabel label="Q16  Are you planning an exercise or simulation?" onReset={() => { setExercise('--'); setContext(null); }} />
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
              <QuestionLabel label="Q17  Is this a restricted target or no-strike entity?" onReset={() => setContext(null)} />
              <Dropdown
                placeholder="Select a context…"
                options={CONTEXT_OPTIONS[exercise]}
                value={context}
                onSelect={setContext}
                zIndex={3}
              />
            </>
          )}
          </View>

          <View style={{ flex: 1 }}>
            {symbolSet !== null && (MODIFIER1_OPTIONS[symbolSet]?.length ?? 0) > 0 && (
              <>
                <QuestionLabel label="Q9  Sector 1 modifier?" onReset={() => setModifier1(null)} />
                <Dropdown
                  placeholder="None"
                  options={[{ value: '00', label: 'None' }, ...(MODIFIER1_OPTIONS[symbolSet] ?? [])]}
                  value={modifier1 ?? '00'}
                  onSelect={setModifier1}
                  zIndex={4}
                />
              </>
            )}

            {symbolSet !== null && (MODIFIER2_OPTIONS[symbolSet]?.length ?? 0) > 0 && (
              <>
                <QuestionLabel label="Q10  Sector 2 modifier?" onReset={() => setModifier2(null)} />
                <Dropdown
                  placeholder="None"
                  options={[{ value: '00', label: 'None' }, ...(MODIFIER2_OPTIONS[symbolSet] ?? [])]}
                  value={modifier2 ?? '00'}
                  onSelect={setModifier2}
                  zIndex={3}
                />
              </>
            )}
          </View>
          </View>
        </View>
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
  searchResultsPanel: {
    marginTop: 8,
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
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  searchResultIconWrap: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  searchResultLabel: { fontSize: 14, color: '#11181C', flex: 1 },
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
  resetButton: { padding: 8, marginLeft: 20 },
  resetIcon: { fontSize: 22, color: '#0a7ea4' },
  topDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#D1D5DB',
    alignSelf: 'stretch',
    marginHorizontal: 16,
  },
  affiliationWrapper: { flex: 1, paddingTop: 4 },
  affiliationHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  affiliationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 12,
  },
  affiliationTile: {
    width: 120,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  affiliationTileSelected: { backgroundColor: '#E5E7EB' },
  affiliationIconWrap: {
    width: 84,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  affiliationLabel: { fontSize: 11, color: '#11181C', textAlign: 'center' },
  questionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#687076',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },
  questionResetIcon: { fontSize: 16, color: '#9CA3AF' },
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
  breadcrumbRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  breadcrumbSep: { fontSize: 14, color: '#9CA3AF', marginHorizontal: 6 },
  breadcrumbItem: { fontSize: 15, color: '#9CA3AF' },
  breadcrumbItemAnswered: { color: '#11181C' },
  breadcrumbItemActive: { color: '#0a7ea4', fontWeight: '700' },
  breadcrumbPanel: {
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
  breadcrumbIconGlyph: {
    fontSize: 22,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  placeholderText: { fontSize: 15, color: '#9CA3AF', fontStyle: 'italic' },
  dropdownItem:             { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  dropdownItemSelected:     { backgroundColor: '#EFF6FF' },
  dropdownItemText:         { fontSize: 15, color: '#11181C' },
  dropdownItemTextSelected: { color: '#0a7ea4', fontWeight: '600' },
  gridWrapper: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  gridSection: { marginTop: 20 },
  gridCategoryHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#687076',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: 100,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  tileSelected: {
    borderColor: '#0a7ea4',
    backgroundColor: '#EFF6FF',
  },
  tileIconWrap: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  tileLabel: {
    fontSize: 11,
    color: '#11181C',
    textAlign: 'center',
  },
});

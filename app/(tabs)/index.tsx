import { ALIASES, type Alias } from '@/assets/data/aliases';
import { ENTITY_OPTIONS, type EntityDef, type EntityType } from '@/assets/data/entityOptions';
import { COMMON_MODIFIER1_OPTIONS, COMMON_MODIFIER2_OPTIONS, MODIFIER1_OPTIONS, MODIFIER2_OPTIONS } from '@/assets/data/modifierOptions';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Fuse from 'fuse.js';
import ms from 'milsymbol';
import { Fragment, useMemo, useState, type ComponentProps } from 'react';
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

// ── Domain / Symbol Set ───────────────────────────────────────────────────────

type Domain = 'Activities' | 'Air' | 'Cyber' | 'Land' | 'Space' | 'Surface' | 'Subsurface';
type Option = { label: string; value: string };

const DOMAINS: Domain[] = ['Activities', 'Air', 'Cyber', 'Land', 'Space', 'Subsurface', 'Surface'] as const;

const DOMAIN_ICONS: Record<Domain, ComponentProps<typeof FontAwesome6>['name']> = {
  Activities: 'exclamation',
  Air: 'wind',
  Cyber: 'computer',
  Land: 'mountain',
  Space: 'moon',
  Surface: 'water',
  Subsurface: 'anchor',
};

const SYMBOL_SETS: Record<Domain, Option[]> = {
  Activities: [
    { value: '40', label: 'Activity/Event' },
  ],
  Air: [
    { value: '01', label: 'Air' },
    { value: '02', label: 'Air Missile' },
    { value: '50', label: 'Signals Intelligence' },
    // Note: "Atmospheric (Weather)" (symbol set 45) is omitted — milsymbol has
    // no icon data for it and it only ever renders the generic unknown glyph.
  ],
  Cyber: [
    { value: '60', label: 'Cyberspace' },
  ],
  Land: [
    { value: '10', label: 'Land Unit' },
    { value: '11', label: 'Land Civilian Unit/Organization' },
    { value: '15', label: 'Land Equipment' },
    { value: '20', label: 'Land Installation' },
    { value: '27', label: 'Dismounted Individuals' },
    { value: '51', label: 'Signals Intelligence' },
  ],
  Space: [
    { value: '05', label: 'Space' },
    { value: '06', label: 'Space Missile' },
    { value: '52', label: 'Signals Intelligence' },
    // Note: "Meteorological Space" (symbol set 47) is omitted — milsymbol has
    // no icon data for it and it only ever renders the generic unknown glyph.
  ],
  Surface: [
    { value: '30', label: 'Sea Surface' },
    { value: '54', label: 'Signals Intelligence' },
  ],
  Subsurface: [
    { value: '35', label: 'Sea Subsurface' },
    { value: '36', label: 'Mine Warfare' },
    { value: '53', label: 'Signals Intelligence' },
    // Note: "Oceanographic" (symbol set 46) is omitted — milsymbol has no
    // icon data for it and it only ever renders the generic unknown glyph.
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

function SymbolPreview({ sidc, colorMode = 'Light', fillMode = 'filledFramed', simpleStatusModifier = false, engagementBar = '', engagementType = '' }: { sidc: string; colorMode?: string; fillMode?: string; simpleStatusModifier?: boolean; engagementBar?: string; engagementType?: string }) {
  const { svg, naturalW, naturalH } = useMemo(() => {
    try {
      const symbol = createSymbol(sidc, { size: 100, colorMode, ...getFillExtras(fillMode, colorMode), simpleStatusModifier: simpleStatusModifier || undefined, ...(engagementBar && { engagementBar }), ...(engagementType && { engagementType }) });
      const { width: naturalW, height: naturalH } = symbol.getSize();
      return { svg: symbol.asSVG(), naturalW, naturalH };
    } catch {
      return { svg: null, naturalW: 0, naturalH: 0 };
    }
  }, [sidc, colorMode, fillMode, simpleStatusModifier, engagementBar, engagementType]);

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

// ── Downloads ─────────────────────────────────────────────────────────────────

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

function downloadSymbolSVG(sidc: string) {
  const symbol = createSymbol(sidc, { size: 200 });
  const blob = new Blob([symbol.asSVG()], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, 'symbol.svg');
  URL.revokeObjectURL(url);
}

function downloadSymbolPNG(sidc: string) {
  const symbol = createSymbol(sidc, { size: 200 });
  const canvas = symbol.asCanvas(2);
  triggerDownload(canvas.toDataURL('image/png'), 'symbol.png');
}

function DownloadButtons({ sidc }: { sidc: string }) {
  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.downloadRow}>
      <TouchableOpacity style={styles.downloadButton} onPress={() => downloadSymbolPNG(sidc)} activeOpacity={0.7}>
        <FontAwesome6 name="file-arrow-down" size={14} color="#11181C" />
        <Text style={styles.downloadButtonText}>PNG</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.downloadButton} onPress={() => downloadSymbolSVG(sidc)} activeOpacity={0.7}>
        <FontAwesome6 name="file-arrow-down" size={14} color="#11181C" />
        <Text style={styles.downloadButtonText}>SVG</Text>
      </TouchableOpacity>
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
  colorMode = 'Light',
  fillMode = 'filledFramed',
  markerSidc,
}: {
  label: string;
  sidc: string;
  selected: boolean;
  onPress: () => void;
  colorMode?: string;
  fillMode?: string;
  markerSidc?: string;
}) {
  const svg = useMemo(() => {
    try {
      const opts = { size: 64, colorMode, ...getFillExtras(fillMode, colorMode) };
      const baseSvg = createSymbol(sidc, opts).asSVG();
      if (markerSidc) {
        // Extract exercise context marker (K/J/X) from the marker-sidc render and inject
        // into the base SVG so the correct frame shape is preserved.
        const markerSvg = createSymbol(markerSidc, opts).asSVG();
        const match = markerSvg.match(/<text[^>]*>[KJX]<\/text>/);
        if (match) return baseSvg.replace('</svg>', match[0] + '</svg>');
      }
      return baseSvg;
    } catch {
      return null;
    }
  }, [sidc, markerSidc, colorMode, fillMode]);

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
  colorMode = 'Light',
  fillMode = 'filledFramed',
}: {
  baseSidc: string;
  affiliation: string;
  onSelect: (v: string) => void;
  colorMode?: string;
  fillMode?: string;
}) {
  return (
    <View style={styles.affiliationWrapper}>
      <Text style={styles.affiliationHeading}>Affiliation</Text>
      <View style={styles.affiliationRow}>
        {AFFILIATION_OPTIONS.map(opt => (
          <AffiliationTile
            key={opt.value}
            label={opt.label}
            sidc={patchSIDC(patchSIDC(baseSidc, 3, '0'), 4, opt.value)}
            selected={affiliation === opt.value}
            onPress={() => onSelect(opt.value)}
            colorMode={colorMode}
            fillMode={fillMode}
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

function DomainTile({
  label,
  icon,
  svg,
  selected,
  onPress,
  disabled = false,
}: {
  label: string;
  icon?: ComponentProps<typeof FontAwesome6>['name'];
  svg?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.tile, selected && styles.tileSelected, disabled && styles.tileDisabled]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <View style={styles.tileIconWrap}>
        {svg ? (
          <SvgXml xml={svg} width={32} height={20} />
        ) : icon ? (
          <FontAwesome6 name={icon} size={28} color="#687076" />
        ) : null}
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
  colorMode = 'Light',
  fillMode = 'filledFramed',
  simpleStatusModifier = false,
  disabled = false,
  engagementBar = '',
  engagementType = '',
}: {
  label: string;
  sidc: string;
  selected: boolean;
  onPress: () => void;
  colorMode?: string;
  fillMode?: string;
  simpleStatusModifier?: boolean;
  disabled?: boolean;
  engagementBar?: string;
  engagementType?: string;
}) {
  const svg = useMemo(() => {
    try {
      const previewSidc = patchSIDC(sidc, 3, '0');
      return createSymbol(previewSidc, { size: 30, colorMode, ...getFillExtras(fillMode, colorMode), simpleStatusModifier: simpleStatusModifier || undefined, ...(engagementBar && { engagementBar }), ...(engagementType && { engagementType }) }).asSVG();
    } catch {
      return null;
    }
  }, [sidc, colorMode, fillMode, simpleStatusModifier, engagementBar, engagementType]);

  return (
    <TouchableOpacity
      style={[styles.tile, selected && styles.tileSelected, disabled && styles.tileDisabled]}
      onPress={onPress}
      activeOpacity={disabled ? 1 : 0.7}
      disabled={disabled}
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
  onSelectCategory,
  colorMode = 'Light',
  fillMode = 'filledFramed',
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
  onSelectCategory: (entity: string) => void;
  colorMode?: string;
  fillMode?: string;
}) {
  function tileSidc(entityVal: string, typeVal: string, subtypeVal = '00') {
    let s = patchSIDC(baseSidc, 11, entityVal);
    s = patchSIDC(s, 13, typeVal);
    s = patchSIDC(s, 15, subtypeVal);
    s = patchSIDC(s, 17, '00');
    s = patchSIDC(s, 19, '00');
    return s;
  }

  // Representative icon for a category tile: the first type (alphabetically)
  // that actually renders, falling back to the category's own icon.
  function categorySidc(category: EntityDef) {
    const sortedTypes = [...category.types].sort((a, b) => a.label.localeCompare(b.label));
    for (const type of sortedTypes) {
      const candidate = tileSidc(category.value, type.value);
      try {
        createSymbol(candidate).asSVG();
        return candidate;
      } catch {
        continue;
      }
    }
    return tileSidc(category.value, '00');
  }

  // Once a type with subtypes is selected, narrow the grid to that type's subtypes (Q5).
  if (selectedEntity && selectedType && selectedTypeDef && selectedTypeDef.subtypes.length > 0) {
    const sortedSubtypes = [...selectedTypeDef.subtypes].sort((a, b) => a.label.localeCompare(b.label));
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
              colorMode={colorMode}
              fillMode={fillMode}
            />
            {sortedSubtypes.map(subtype => {
              const isSelected = selectedSubtype === subtype.value;
              return (
                <EntityTypeTile
                  key={subtype.value}
                  label={subtype.label}
                  sidc={isSelected ? currentSidc : tileSidc(selectedEntity, selectedType, subtype.value)}
                  selected={isSelected}
                  onPress={() => onSelectSubtype(subtype.value)}
                  colorMode={colorMode}
                  fillMode={fillMode}
                />
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  const sortedEntityData = [...entityData].sort((a, b) => a.label.localeCompare(b.label));

  // More than one sub group (entity category) under this symbol set: show the
  // sub groups themselves first, rather than flattening every type at once.
  if (sortedEntityData.length > 1) {
    return (
      <View style={styles.gridSection}>
        <View style={styles.gridRow}>
          {sortedEntityData.map(category => (
            <EntityTypeTile
              key={category.value}
              label={category.label}
              sidc={categorySidc(category)}
              selected={false}
              onPress={() => onSelectCategory(category.value)}
              colorMode={colorMode}
              fillMode={fillMode}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View>
      {sortedEntityData.map(category => {
        const sortedTypes = [...category.types].sort((a, b) => a.label.localeCompare(b.label));
        return (
          <View key={category.value} style={styles.gridSection}>
            <Text style={styles.gridCategoryHeading}>{category.label}</Text>
            <View style={styles.gridRow}>
              {sortedTypes.length === 0 ? (
                <EntityTypeTile
                  label={category.label}
                  sidc={selectedEntity === category.value ? currentSidc : tileSidc(category.value, '00')}
                  selected={selectedEntity === category.value}
                  onPress={() => onSelect(category.value, '00')}
                  colorMode={colorMode}
                  fillMode={fillMode}
                />
              ) : (
                sortedTypes.map(type => {
                  const isSelected = selectedEntity === category.value && selectedType === type.value;
                  return (
                    <EntityTypeTile
                      key={type.value}
                      label={type.label}
                      sidc={isSelected ? currentSidc : tileSidc(category.value, type.value)}
                      selected={isSelected}
                      onPress={() => onSelect(category.value, type.value)}
                      colorMode={colorMode}
                      fillMode={fillMode}
                    />
                  );
                })
              )}
            </View>
          </View>
        );
      })}
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
  // True for leaf steps (e.g. Subtype) that never lead to a further step —
  // these are excluded from the "current hierarchy" highlight, which stays
  // on their parent (e.g. Type) instead.
  leaf?: boolean;
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
  // Highlight the deepest step that has been answered (the current hierarchy
  // position), not the next step awaiting a selection.
  const currentStep = steps.reduce((acc, s) => (s.value && !s.leaf ? s.step : acc), -1);

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
                currentStep === s.step && styles.breadcrumbItemActive,
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

const ECHELON_GROUP_OPTIONS: Option[] = [
  { value: '0', label: 'Unknown' },
  { value: '1', label: 'Brigade and below' },
  { value: '2', label: 'Division and above' },
  { value: '7', label: 'Individual Leader' },
];

// Custom "XX" glyph for the Division and above tile (two touching X marks).
const DIVISION_XX_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 20">
  <g stroke="#687076" stroke-width="3" stroke-linecap="round" fill="none">
    <path d="M1,2 L15,18 M15,2 L1,18" />
    <path d="M17,2 L31,18 M31,2 L17,18" />
  </g>
</svg>`;

// Sentinel value for modifier1Category/modifier2Category marking "the
// dimension-specific group" (as opposed to one of the common-modifier
// category names, which are arbitrary strings from the MIL-STD-2525E data).
const DIMENSION_GROUP = '__dimension__';

const STATUS_OPTIONS: (Option & { simpleStatusModifier?: boolean })[] = [
  { value: '0', label: 'Present' },
  { value: '1', label: 'Planned/Anticipated/Suspect' },
  { value: '2', label: 'Present/Fully Capable' },
  { value: '3', label: 'Damaged (Bar)' },
  { value: '3', label: 'Damaged (Slash)', simpleStatusModifier: true },
  { value: '4', label: 'Destroyed (Bar)' },
  { value: '4', label: 'Destroyed (X)', simpleStatusModifier: true },
  { value: '5', label: 'Present/Full to Capacity' },
];

const ENGAGEMENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '',           label: 'None' },
  { value: 'TARGET',     label: 'Target' },
  { value: 'NON-TARGET', label: 'Non-Target' },
  { value: 'EXPIRED',    label: 'Expired' },
];

const HQTFFD_OPTIONS: Option[] = [
  { value: '0', label: 'Unknown' },
  { value: '1', label: 'Feint/Decoy/Dummy' },
  { value: '2', label: 'Headquarters' },
  { value: '3', label: 'Feint/Dummy Headquarters' },
  { value: '4', label: 'Task Force' },
  { value: '5', label: 'Feint/Dummy Task Force' },
  { value: '6', label: 'Task Force Headquarters' },
  { value: '7', label: 'Feint/Dummy Task Force Headquarters' },
];

const EXERCISE_OPTIONS: Option[] = [
  { value: 'real', label: 'Reality' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'simulation', label: 'Simulation' },
];

const EXERCISE_CONTEXT_BASELINE: Record<string, string> = {
  real: '0',
  exercise: '1',
  simulation: '2',
};

const MOBILITY_TYPE_OPTIONS: { value: string; label: string; icon: ComponentProps<typeof FontAwesome6>['name'] }[] = [
  { value: '3', label: 'Mobile on land', icon: 'mountain' },
  { value: '4', label: 'Mobile on snow', icon: 'snowflake' },
  { value: '5', label: 'Mobile on water', icon: 'water' },
  { value: '6', label: 'Naval towed array', icon: 'ship' },
];

const COLOR_MODE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Light',    label: 'Light' },
  { value: 'Medium',   label: 'Medium' },
  { value: 'Dark',     label: 'Dark' },
  { value: 'Black',    label: 'Black' },
  { value: 'White',    label: 'White' },
  { value: 'OffWhite', label: 'Off White' },
];

const FILL_OPTIONS: { value: string; label: string }[] = [
  { value: 'filledFramed',  label: 'Filled + Framed' },
  { value: 'noFillColor',   label: 'No Fill + Color' },
  { value: 'filledNoFrame', label: 'Filled + No Frame' },
  { value: 'noFillMono',    label: 'No Fill + Mono' },
  { value: 'noFillNoFrame', label: 'No Fill + No Frame' },
];

function getFillExtras(fillMode: string, colorMode: string): Record<string, unknown> {
  const modeColors = COLOR_MODE_FILLS[colorMode] ?? COLOR_MODE_FILLS.Light;
  switch (fillMode) {
    case 'noFillColor':   return { fill: false, frameColor: { ...modeColors } };
    case 'filledNoFrame': return { strokeWidth: 0 };
    case 'noFillMono':    return { monoColor: 'black' };
    case 'noFillNoFrame': return { fill: false, frame: false, frameColor: { ...modeColors } };
    default:              return {};
  }
}

function patchSIDC(sidc: string, pos: number, value: string) {
  const i = pos - 1; // pos is 1-indexed
  return sidc.slice(0, i) + value + sidc.slice(i + value.length);
}

// milsymbol's "Black" colorMode sets fill to black but still draws the frame
// and icon strokes in black (the default), making the symbol a solid blob.
// Override frame and icon to white so "Black" renders as an inverse: white
// lines on a black field, mirroring the "White" mode in the opposite sense.
const ALL_WHITE_COLOR = {
  Civilian: 'white', Friend: 'white', Hostile: 'white',
  Neutral: 'white', Unknown: 'white', Suspect: 'white',
};


// Fill colors for each named color mode, mirroring milsymbol's colormodes.js.
// Used to compute the Suspect/Joker fix dynamically per mode (see below).
const COLOR_MODE_FILLS: Record<string, Record<string, string | false>> = {
  Light:      { Civilian: 'rgb(255,161,255)', Friend: 'rgb(128,224,255)', Hostile: 'rgb(255,128,128)', Neutral: 'rgb(170,255,170)', Unknown: 'rgb(255,255,128)', Suspect: 'rgb(255,229,153)' },
  Medium:     { Civilian: 'rgb(128,0,128)',   Friend: 'rgb(0,168,220)',   Hostile: 'rgb(255,48,49)',   Neutral: 'rgb(0,226,110)',   Unknown: 'rgb(255,255,0)',   Suspect: 'rgb(255,217,107)' },
  Dark:       { Civilian: 'rgb(80,0,80)',     Friend: 'rgb(0,107,140)',   Hostile: 'rgb(200,0,0)',     Neutral: 'rgb(0,160,0)',     Unknown: 'rgb(225,220,0)',   Suspect: 'rgb(255,188,1)'   },
  Black:      { Civilian: 'black',            Friend: 'black',            Hostile: 'black',            Neutral: 'black',           Unknown: 'black',            Suspect: 'black'            },
  White:      { Civilian: 'white',            Friend: 'white',            Hostile: 'white',            Neutral: 'white',           Unknown: 'white',            Suspect: 'white'            },
  OffWhite:   { Civilian: 'rgb(239,239,239)', Friend: 'rgb(239,239,239)', Hostile: 'rgb(239,239,239)', Neutral: 'rgb(239,239,239)',Unknown: 'rgb(239,239,239)', Suspect: 'rgb(239,239,239)' },
  None:       { Civilian: false,              Friend: false,              Hostile: false,              Neutral: false,             Unknown: false,              Suspect: false              },
};

function createSymbol(sidc: string, options: Record<string, unknown> = {}) {
  const withBlackFix = options.colorMode === 'Black'
    ? { ...options, frameColor: { ...ALL_WHITE_COLOR }, iconColor: { ...ALL_WHITE_COLOR } }
    : options;

  const isSuspect = sidc.charAt(3) === '5';
  if (!isSuspect) return new ms.Symbol(sidc, withBlackFix);

  // milsymbol renders Suspect/Joker using the Hostile color bucket, so
  // suspects appear red in every mode. Redirect Hostile → the mode's own
  // Suspect color so the fill responds correctly to the selected color mode.
  const modeName = typeof withBlackFix.colorMode === 'string' ? withBlackFix.colorMode : 'Light';
  const modeColors = COLOR_MODE_FILLS[modeName] ?? COLOR_MODE_FILLS.Light;
  const suspectFix = { ...modeColors, Hostile: modeColors.Suspect };

  // When a custom frameColor object is provided (e.g. noFillColor / noFillNoFrame),
  // milsymbol's joker mutation runs `baseFrameColor.Friend = baseFrameColor.Hostile`.
  // Apply the same Hostile → Suspect redirect there so the stroke color resolves
  // to orange rather than red.
  const fc = withBlackFix.frameColor;
  const frameColor = typeof fc === 'object' && fc !== null
    ? { ...(fc as Record<string, string | false>), Hostile: (fc as Record<string, string | false>).Suspect }
    : fc;

  return new ms.Symbol(sidc, { ...withBlackFix, colorMode: suspectFix as any, frameColor });
}

// ── Dynamic alias persistence ─────────────────────────────────────────────────

function loadDynamicAliases(): Alias[] {
  if (Platform.OS !== 'web') return [];
  try {
    const raw = localStorage.getItem('milsymbol-aliases');
    return raw ? (JSON.parse(raw) as Alias[]) : [];
  } catch {
    return [];
  }
}

function saveDynamicAliases(aliases: Alias[]) {
  if (Platform.OS !== 'web') return;
  try {
    localStorage.setItem('milsymbol-aliases', JSON.stringify(aliases));
  } catch {}
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

ALIASES.forEach(a => {
  SEARCH_INDEX.push({
    key: `alias-${a.alias.toLowerCase()}`,
    domain: a.domain as Domain,
    symbolSet: a.symbolSet,
    symbolSetLabel: a.symbolSetLabel,
    entity: a.entity,
    entityType: a.entityType,
    entitySubtype: a.entitySubtype,
    pathLabel: `${a.alias} → ${a.targetLabel}`,
    leafLabel: a.alias,
    sidc: buildSearchSidc(a.symbolSet, a.entity, a.entityType ?? '00', a.entitySubtype ?? '00'),
  });
});

const SEARCH_FUSE = new Fuse(SEARCH_INDEX, {
  keys: [
    { name: 'leafLabel', weight: 0.6 },
    { name: 'pathLabel', weight: 0.4 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
});

// ── SearchResultRow ───────────────────────────────────────────────────────────

function SearchResultRow({ result, affiliation, onPress, colorMode = 'Light', fillMode = 'filledFramed' }: { result: SearchResult; affiliation: string; onPress: () => void; colorMode?: string; fillMode?: string }) {
  const svg = useMemo(() => {
    try {
      return createSymbol(patchSIDC(result.sidc, 4, affiliation), { size: 20, colorMode, ...getFillExtras(fillMode, colorMode) }).asSVG();
    } catch {
      return null;
    }
  }, [result.sidc, affiliation, colorMode, fillMode]);

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
  const [exercise, setExercise]       = useState('real');
  const [context, setContext]         = useState<string | null>(null);
  const [domain, setDomain]           = useState<Domain | null>(null);
  const [symbolSet, setSymbolSet]     = useState<string | null>(null);
  const [affiliation, setAffiliation] = useState('3');
  const [status, setStatus]           = useState('0');
  const [hqtffd, setHqtffd]           = useState('0');
  const [echelonGroup, setEchelonGroup] = useState('0');
  const [echelon, setEchelon]           = useState<string | null>(null);
  const [mobility, setMobility]         = useState<string | null>(null);
  const [mobilityEchelon, setMobilityEchelon] = useState('0');
  const [entity,        setEntity]        = useState<string | null>(null);
  const [entityType,    setEntityType]    = useState<string | null>(null);
  const [entitySubtype, setEntitySubtype] = useState<string | null>(null);
  const [modifier1, setModifier1] = useState<string | null>(null);
  const [modifier2, setModifier2] = useState<string | null>(null);
  const [modifier1Common, setModifier1Common] = useState(false);
  const [modifier2Common, setModifier2Common] = useState(false);
  const [modifier1Category, setModifier1Category] = useState<string | null>(null);
  const [modifier2Category, setModifier2Category] = useState<string | null>(null);
  const [openStep, setOpenStep]   = useState<number | null>(1);
  const [colorMode, setColorMode] = useState('Light');
  const [fillMode,  setFillMode]  = useState('filledFramed');
  const [simpleStatusModifier, setSimpleStatusModifier] = useState(false);
  const [engagementBarText, setEngagementBarText] = useState('');
  const [engagementType, setEngagementType] = useState('');
  const [aliasText, setAliasText] = useState('');
  const [dynamicAliases, setDynamicAliases] = useState<Alias[]>(loadDynamicAliases);

  function resetAll() {
    setExercise('real');
    setContext(null);
    setDomain(null);
    setSymbolSet(null);
    setEntity(null);
    setEntityType(null);
    setEntitySubtype(null);
    setAffiliation('3');
    setStatus('0');
    setHqtffd('0');
    setEchelonGroup('0');
    setEchelon(null);
    setMobility(null);
    setMobilityEchelon('0');
    setModifier1(null);
    setModifier2(null);
    setModifier1Common(false);
    setModifier2Common(false);
    setModifier1Category(null);
    setModifier2Category(null);
    setOpenStep(1);
    setColorMode('Light');
    setFillMode('filledFramed');
    setSimpleStatusModifier(false);
    setEngagementBarText('');
    setEngagementType('');
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
      setModifier1(null); setModifier2(null); setMobility(null); setMobilityEchelon('0');
      setEchelonGroup('0'); setEchelon(null);
    } else if (step === 1) {
      setSymbolSet(null); setEntity(null); setEntityType(null); setEntitySubtype(null);
      setModifier1(null); setModifier2(null); setMobility(null); setMobilityEchelon('0');
      setEchelonGroup('0'); setEchelon(null);
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
    if (result.symbolSet !== '15' && result.symbolSet !== '35') { setMobility(null); setMobilityEchelon('0'); }
    if (result.symbolSet !== '27') { setEchelonGroup('0'); setEchelon(null); }
    setEntity(result.entity);
    setEntityType(result.entityType);
    setEntitySubtype(result.entitySubtype);
    setModifier1(null);
    setModifier2(null);
    setOpenStep(null);
    setQuery('');
  }

  function handleExerciseSelect(v: string) {
    setExercise(v);
    setContext(EXERCISE_CONTEXT_BASELINE[v] ?? null);
  }

  const sidc = useMemo(() => {
    let s = patchSIDC(DEFAULT_SIDC, 3, context ?? '0');
    s = patchSIDC(s, 4, affiliation ?? '3');
    s = patchSIDC(s, 5, symbolSet ?? '00');
    s = patchSIDC(s, 7, status ?? '0');
    s = patchSIDC(s, 8, hqtffd);
    const digit9 = echelonGroup !== '0' ? echelonGroup : (mobility ?? '0');
    s = patchSIDC(s, 9, digit9);
    s = patchSIDC(s, 10, echelonGroup !== '0' ? (echelon ?? '0') : mobilityEchelon);
    s = patchSIDC(s, 11, entity       ?? '00');
    s = patchSIDC(s, 13, entityType   ?? '00');
    s = patchSIDC(s, 15, entitySubtype ?? '00');
    s = patchSIDC(s, 17, modifier1 ?? '00');
    s = patchSIDC(s, 19, modifier2 ?? '00');
    s = patchSIDC(s, 21, modifier1Common ? '1' : '0');
    s = patchSIDC(s, 22, modifier2Common ? '1' : '0');
    return s;
  }, [context, affiliation, symbolSet, status, hqtffd, echelonGroup, echelon, mobility, mobilityEchelon, entity, entityType, entitySubtype, modifier1, modifier2, modifier1Common, modifier2Common]);

  function handleDomainSelect(d: Domain) {
    setDomain(d);
    setSymbolSet(null);
    setMobility(null); setMobilityEchelon('0');
    setEchelonGroup('0'); setEchelon(null);
    setEntity(null);
    setEntityType(null);
    setEntitySubtype(null);
    setModifier1(null);
    setModifier2(null);
  }

  const symbolSetLabel = domain && symbolSet ? (SYMBOL_SETS[domain].find(o => o.value === symbolSet)?.label ?? symbolSet) : null;
  const mobilityEnabled = symbolSet === '15' || symbolSet === '35';
  const disabledMobilityValues = mobilityEnabled
    ? symbolSet === '35' ? new Set(['3', '4', '5']) : new Set(['6'])
    : new Set<string>();
  const allEntityData = symbolSet !== null ? (ENTITY_OPTIONS[symbolSet] ?? null) : null;
  const entityData = allEntityData;
  const entityDef     = entity !== null && entityData !== null ? (entityData.find(e => e.value === entity) ?? null) : null;
  const entityTypeDef = entityType !== null && entityDef !== null ? (entityDef.types.find(t => t.value === entityType) ?? null) : null;

  const dynamicFuse = useMemo(() => {
    const items: SearchResult[] = dynamicAliases.map(a => ({
      key: `dyn-alias-${a.alias.toLowerCase()}`,
      domain: a.domain as Domain,
      symbolSet: a.symbolSet,
      symbolSetLabel: a.symbolSetLabel,
      entity: a.entity,
      entityType: a.entityType,
      entitySubtype: a.entitySubtype,
      pathLabel: `${a.alias} → ${a.targetLabel}`,
      leafLabel: a.alias,
      sidc: buildSearchSidc(a.symbolSet, a.entity, a.entityType ?? '00', a.entitySubtype ?? '00'),
    }));
    return new Fuse(items, { keys: [{ name: 'leafLabel', weight: 0.6 }, { name: 'pathLabel', weight: 0.4 }], threshold: 0.35, ignoreLocation: true });
  }, [dynamicAliases]);

  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const staticHits = SEARCH_FUSE.search(q).map(r => r.item);
    const dynamicHits = dynamicFuse.search(q).map(r => r.item);
    const seen = new Set(staticHits.map(r => r.key));
    return [...staticHits, ...dynamicHits.filter(r => !seen.has(r.key))].slice(0, 20);
  }, [query, dynamicFuse]);

  function handleAddAlias() {
    const name = aliasText.trim();
    if (!domain || !symbolSet || !entity || !name) return;
    const subtypeDef = entityTypeDef?.subtypes.find(s => s.value === entitySubtype);
    const pathParts = [
      `${domain} › ${symbolSetLabel ?? symbolSet}`,
      entityDef?.label,
      entityTypeDef?.label,
      subtypeDef?.label,
    ].filter((p): p is string => Boolean(p));
    const newAlias: Alias = {
      alias: name,
      domain,
      symbolSet,
      symbolSetLabel: symbolSetLabel ?? symbolSet,
      entity,
      entityType,
      entitySubtype,
      targetLabel: pathParts.join(' › '),
    };
    const updated = [...dynamicAliases, newAlias];
    setDynamicAliases(updated);
    saveDynamicAliases(updated);
    setAliasText('');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Symbol Lookup</Text>
        <View style={styles.aliasControls}>
          <Text style={styles.aliasLabel}>Alias</Text>
          <TextInput
            style={styles.aliasInput}
            placeholder="Name…"
            placeholderTextColor="#999"
            value={aliasText}
            onChangeText={setAliasText}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleAddAlias}
          />
          <TouchableOpacity
            style={[styles.aliasButton, (!entity || !aliasText.trim()) && styles.aliasButtonDisabled]}
            onPress={handleAddAlias}
            disabled={!entity || !aliasText.trim()}
            activeOpacity={0.7}
          >
            <Text style={styles.aliasButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <SymbolPreview sidc={patchSIDC(sidc, 3, '0')} colorMode={colorMode} fillMode={fillMode} simpleStatusModifier={simpleStatusModifier} engagementBar={engagementBarText} engagementType={engagementType} />
            <TouchableOpacity onPress={resetAll} style={styles.resetButton} activeOpacity={0.6}>
              <Text style={styles.resetIcon}>Reset ↺</Text>
            </TouchableOpacity>
          </View>
          <DownloadButtons sidc={sidc} />
        </View>

        <View style={styles.topDivider} />

        <View style={{ flex: 1, paddingTop: 4 }}>
          <Text style={[styles.sectionHeading, { marginBottom: 16 }]}>Identity</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <AffiliationPicker baseSidc={sidc} affiliation={affiliation} onSelect={setAffiliation} colorMode={colorMode} fillMode={fillMode} />
            <View style={styles.topDivider} />
            <View>
              <Text style={[styles.affiliationHeading, { paddingHorizontal: 12 }]}>Reality / Exercise / Simulation</Text>
              <View style={styles.affiliationRow}>
                {EXERCISE_OPTIONS.map(opt => {
                  const contextVal = EXERCISE_CONTEXT_BASELINE[opt.value] ?? '0';
                  const isExercise = contextVal === '1';
                  return (
                  <AffiliationTile
                    key={opt.value}
                    label={opt.label}
                    sidc={patchSIDC(sidc, 3, isExercise ? '0' : contextVal)}
                    markerSidc={isExercise ? patchSIDC(sidc, 3, '1') : undefined}
                    selected={exercise === opt.value}
                    onPress={() => handleExerciseSelect(opt.value)}
                    colorMode={colorMode}
                    fillMode={fillMode}
                  />
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.searchWrapper}>
        <Text style={[styles.sectionHeading, { marginBottom: 16 }]}>Search</Text>
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
              <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {searchResults.map(result => (
                  <SearchResultRow
                    key={result.key}
                    result={result}
                    affiliation={affiliation}
                    onPress={() => handleSearchSelect(result)}
                    colorMode={colorMode}
                    fillMode={fillMode}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={[styles.sectionHeading, { marginBottom: 16 }]}>Symbol Builder</Text>
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
                placeholder: 'Domain',
                value: domain,
                options: DOMAINS.map(d => ({ value: d, label: d })),
                onSelect: v => { handleDomainSelect(v as Domain); setOpenStep(2); },
              },
              ...(domain ? [{
                step: 2,
                label: 'Sub-domain',
                display: symbolSetLabel,
                placeholder: 'Sub-domain',
                value: symbolSet,
                options: SYMBOL_SETS[domain],
                onSelect: (v: string) => {
                  setSymbolSet(v); setEntity(null); setEntityType(null); setEntitySubtype(null);
                  setModifier1(null); setModifier2(null);
                  if (v !== '15' && v !== '35') { setMobility(null); setMobilityEchelon('0'); }
                  if (v !== '27') { setEchelonGroup('0'); setEchelon(null); }
                  setOpenStep(3);
                },
              }] : []),
              ...(symbolSet !== null ? [{
                step: 3,
                label: 'Entity',
                display: entityDef?.label ?? null,
                placeholder: 'Entity',
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
                placeholder: 'Type',
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
                placeholder: 'Subtype',
                value: entitySubtype,
                options: entityTypeDef.subtypes,
                onSelect: (v: string) => { setEntitySubtype(v); setOpenStep(null); },
                leaf: true,
              }] : []),
            ]}
          />

          {domain === null && (
            <View style={styles.gridSection}>
              <View style={styles.gridRow}>
                {DOMAINS.map(d => (
                  <DomainTile
                    key={d}
                    label={d}
                    icon={DOMAIN_ICONS[d]}
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
                {[...SYMBOL_SETS[domain]].sort((a, b) => a.label.localeCompare(b.label)).map(opt => (
                  <EntityTypeTile
                    key={opt.value}
                    label={opt.label}
                    sidc={patchSIDC(sidc, 5, opt.value)}
                    selected={false}
                    onPress={() => { setSymbolSet(opt.value); setOpenStep(3); }}
                    colorMode={colorMode}
                    fillMode={fillMode}
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
              colorMode={colorMode}
              fillMode={fillMode}
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
              onSelectCategory={v => {
                handleEntitySelect(v);
                const def = entityData?.find(e => e.value === v);
                setOpenStep(def && def.types.length > 0 ? 4 : null);
              }}
            />
          )}
        </View>

        <View style={styles.gridWrapper}>
          <Text style={[styles.sectionHeading, { marginBottom: 16 }]}>Color Options</Text>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={styles.gridSection}>
              <Text style={styles.gridCategoryHeading}>Color Mode</Text>
              <View style={styles.gridRow}>
                {COLOR_MODE_OPTIONS.map(opt => (
                  <EntityTypeTile
                    key={opt.value}
                    label={opt.label}
                    sidc={sidc}
                    colorMode={opt.value}
                    fillMode={fillMode}
                    selected={colorMode === opt.value}
                    onPress={() => setColorMode(opt.value)}
                  />
                ))}
              </View>
            </View>

            <View style={[styles.topDivider, { marginTop: 20 }]} />

            <View style={styles.gridSection}>
              <Text style={styles.gridCategoryHeading}>Fill & Frame Options</Text>
              <View style={styles.gridRow}>
                {FILL_OPTIONS.map(opt => (
                  <EntityTypeTile
                    key={opt.value}
                    label={opt.label}
                    sidc={sidc}
                    colorMode={colorMode}
                    fillMode={opt.value}
                    selected={fillMode === opt.value}
                    onPress={() => setFillMode(opt.value)}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.gridWrapper}>
          <Text style={[styles.sectionHeading, { marginBottom: 16 }]}>Other Modifiers</Text>

          {symbolSet !== null && (
            <View style={styles.gridSection}>
              <View style={[styles.breadcrumbRow, { marginBottom: 12 }]}>
                <TouchableOpacity onPress={() => setModifier1Category(null)} activeOpacity={0.7}>
                  <Text style={[styles.breadcrumbItem, styles.breadcrumbItemAnswered, modifier1Category === null && styles.breadcrumbItemActive]}>Sector 1 Modifiers</Text>
                </TouchableOpacity>
                {modifier1Category !== null && (
                  <>
                    <Text style={styles.breadcrumbSep}>›</Text>
                    <Text style={[styles.breadcrumbItem, styles.breadcrumbItemAnswered, styles.breadcrumbItemActive]}>
                      {modifier1Category === DIMENSION_GROUP ? symbolSetLabel : modifier1Category}
                    </Text>
                  </>
                )}
              </View>

              {modifier1Category === null ? (
                <View style={styles.gridRow}>
                  {(() => {
                    const firstDimensionMod = [...(MODIFIER1_OPTIONS[symbolSet] ?? [])].sort((a, b) => a.label.localeCompare(b.label))[0];
                    return firstDimensionMod && (
                      <EntityTypeTile
                        label={symbolSetLabel ?? 'Dimension-Specific'}
                        sidc={patchSIDC(patchSIDC(sidc, 17, firstDimensionMod.value), 21, '0')}
                        selected={false}
                        onPress={() => setModifier1Category(DIMENSION_GROUP)}
                        colorMode={colorMode}
                        fillMode={fillMode}
                      />
                    );
                  })()}
                  {[...new Set(COMMON_MODIFIER1_OPTIONS.map(o => o.category))].sort().map(cat => {
                    const firstInCat = COMMON_MODIFIER1_OPTIONS.filter(o => o.category === cat).sort((a, b) => a.label.localeCompare(b.label))[0];
                    return (
                      <EntityTypeTile
                        key={cat}
                        label={cat}
                        sidc={patchSIDC(patchSIDC(sidc, 17, firstInCat.value), 21, '1')}
                        selected={false}
                        onPress={() => setModifier1Category(cat)}
                        colorMode={colorMode}
                        fillMode={fillMode}
                      />
                    );
                  })}
                </View>
              ) : modifier1Category === DIMENSION_GROUP ? (
                <View style={styles.gridRow}>
                  {[{ value: '00', label: 'None' }, ...[...(MODIFIER1_OPTIONS[symbolSet] ?? [])].sort((a, b) => a.label.localeCompare(b.label))].map(opt => (
                    <EntityTypeTile
                      key={opt.value}
                      label={opt.label}
                      sidc={patchSIDC(patchSIDC(sidc, 17, opt.value), 21, '0')}
                      selected={!modifier1Common && (modifier1 ?? '00') === opt.value}
                      onPress={() => { setModifier1(opt.value); setModifier1Common(false); }}
                      colorMode={colorMode}
                      fillMode={fillMode}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.gridRow}>
                  {COMMON_MODIFIER1_OPTIONS
                    .filter(o => o.category === modifier1Category)
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .map(opt => (
                      <EntityTypeTile
                        key={opt.value}
                        label={opt.label}
                        sidc={patchSIDC(patchSIDC(sidc, 17, opt.value), 21, '1')}
                        selected={modifier1Common && modifier1 === opt.value}
                        onPress={() => { setModifier1(opt.value); setModifier1Common(true); }}
                        colorMode={colorMode}
                        fillMode={fillMode}
                      />
                    ))}
                </View>
              )}
            </View>
          )}

          {symbolSet !== null && (
            <View style={styles.gridSection}>
              <View style={[styles.breadcrumbRow, { marginBottom: 12 }]}>
                <TouchableOpacity onPress={() => setModifier2Category(null)} activeOpacity={0.7}>
                  <Text style={[styles.breadcrumbItem, styles.breadcrumbItemAnswered, modifier2Category === null && styles.breadcrumbItemActive]}>Sector 2 Modifiers</Text>
                </TouchableOpacity>
                {modifier2Category !== null && (
                  <>
                    <Text style={styles.breadcrumbSep}>›</Text>
                    <Text style={[styles.breadcrumbItem, styles.breadcrumbItemAnswered, styles.breadcrumbItemActive]}>
                      {modifier2Category === DIMENSION_GROUP ? symbolSetLabel : modifier2Category}
                    </Text>
                  </>
                )}
              </View>

              {modifier2Category === null ? (
                <View style={styles.gridRow}>
                  {(() => {
                    const firstDimensionMod = [...(MODIFIER2_OPTIONS[symbolSet] ?? [])].sort((a, b) => a.label.localeCompare(b.label))[0];
                    return firstDimensionMod && (
                      <EntityTypeTile
                        label={symbolSetLabel ?? 'Dimension-Specific'}
                        sidc={patchSIDC(patchSIDC(sidc, 19, firstDimensionMod.value), 22, '0')}
                        selected={false}
                        onPress={() => setModifier2Category(DIMENSION_GROUP)}
                        colorMode={colorMode}
                        fillMode={fillMode}
                      />
                    );
                  })()}
                  {[...new Set(COMMON_MODIFIER2_OPTIONS.map(o => o.category))].sort().map(cat => {
                    const firstInCat = COMMON_MODIFIER2_OPTIONS.filter(o => o.category === cat).sort((a, b) => a.label.localeCompare(b.label))[0];
                    return (
                      <EntityTypeTile
                        key={cat}
                        label={cat}
                        sidc={patchSIDC(patchSIDC(sidc, 19, firstInCat.value), 22, '1')}
                        selected={false}
                        onPress={() => setModifier2Category(cat)}
                        colorMode={colorMode}
                        fillMode={fillMode}
                      />
                    );
                  })}
                </View>
              ) : modifier2Category === DIMENSION_GROUP ? (
                <View style={styles.gridRow}>
                  {[{ value: '00', label: 'None' }, ...[...(MODIFIER2_OPTIONS[symbolSet] ?? [])].sort((a, b) => a.label.localeCompare(b.label))].map(opt => (
                    <EntityTypeTile
                      key={opt.value}
                      label={opt.label}
                      sidc={patchSIDC(patchSIDC(sidc, 19, opt.value), 22, '0')}
                      selected={!modifier2Common && (modifier2 ?? '00') === opt.value}
                      onPress={() => { setModifier2(opt.value); setModifier2Common(false); }}
                      colorMode={colorMode}
                      fillMode={fillMode}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.gridRow}>
                  {COMMON_MODIFIER2_OPTIONS
                    .filter(o => o.category === modifier2Category)
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .map(opt => (
                      <EntityTypeTile
                        key={opt.value}
                        label={opt.label}
                        sidc={patchSIDC(patchSIDC(sidc, 19, opt.value), 22, '1')}
                        selected={modifier2Common && modifier2 === opt.value}
                        onPress={() => { setModifier2(opt.value); setModifier2Common(true); }}
                        colorMode={colorMode}
                        fillMode={fillMode}
                      />
                    ))}
                </View>
              )}
            </View>
          )}

          <View style={{ marginTop: 20 }}>
            <View style={styles.breadcrumbRow}>
              <TouchableOpacity onPress={() => { setEchelonGroup('0'); setEchelon(null); }} activeOpacity={0.7}>
                <Text style={[styles.breadcrumbItem, styles.breadcrumbItemAnswered, echelonGroup === '0' && styles.breadcrumbItemActive]}>Leadership</Text>
              </TouchableOpacity>
              {echelonGroup !== '0' && (
                <>
                  <Text style={styles.breadcrumbSep}>›</Text>
                  <TouchableOpacity onPress={() => setEchelon(null)} activeOpacity={0.7}>
                    <Text style={[styles.breadcrumbItem, styles.breadcrumbItemAnswered, styles.breadcrumbItemActive]}>
                      {ECHELON_GROUP_OPTIONS.find(o => o.value === echelonGroup)?.label}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              {echelonGroup !== '0' && echelon !== null && (
                <>
                  <Text style={styles.breadcrumbSep}>›</Text>
                  <Text style={[styles.breadcrumbItem, styles.breadcrumbItemAnswered]}>
                    {ECHELON_OPTIONS[echelonGroup]?.find(o => o.value === echelon)?.label ?? 'Echelon'}
                  </Text>
                </>
              )}
            </View>

            {echelonGroup === '0' && (
              <View style={styles.gridSection}>
                <View style={styles.gridRow}>
                  {ECHELON_GROUP_OPTIONS.filter(opt => opt.value !== '0').map(opt => (
                    <DomainTile
                      key={`leadership-${opt.value}`}
                      label={opt.label}
                      icon={opt.value === '1' ? 'x' : opt.value === '7' ? 'chevron-up' : undefined}
                      svg={opt.value === '2' ? DIVISION_XX_SVG : undefined}
                      selected={false}
                      disabled={opt.value === '7' && symbolSet !== '27'}
                      onPress={() => { setEchelonGroup(opt.value); setEchelon(null); setMobility(null); setMobilityEchelon('0'); }}
                    />
                  ))}
                </View>
              </View>
            )}

            {echelonGroup !== '0' && (
              <View style={styles.gridSection}>
                <View style={styles.gridRow}>
                  {(ECHELON_OPTIONS[echelonGroup] ?? []).map(opt => (
                    <EntityTypeTile
                      key={opt.value}
                      label={opt.label}
                      sidc={patchSIDC(patchSIDC(sidc, 9, echelonGroup), 10, opt.value)}
                      selected={echelon === opt.value}
                      onPress={() => setEchelon(opt.value)}
                      colorMode={colorMode}
                      fillMode={fillMode}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>

          <View style={{ marginTop: 20, opacity: mobilityEnabled ? 1 : 0.35, pointerEvents: mobilityEnabled ? 'auto' : 'none' }}>
            <View style={styles.breadcrumbRow}>
              <TouchableOpacity onPress={() => { setMobility(null); setMobilityEchelon('0'); }} activeOpacity={0.7}>
                <Text style={[styles.breadcrumbItem, styles.breadcrumbItemAnswered, mobility === null && styles.breadcrumbItemActive]}>Mobility</Text>
              </TouchableOpacity>
              {mobility !== null && (
                <>
                  <Text style={styles.breadcrumbSep}>›</Text>
                  <TouchableOpacity onPress={() => setMobilityEchelon('0')} activeOpacity={0.7}>
                    <Text style={[styles.breadcrumbItem, styles.breadcrumbItemAnswered, styles.breadcrumbItemActive]}>
                      {MOBILITY_TYPE_OPTIONS.find(o => o.value === mobility)?.label}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              {mobility !== null && (MOBILITY_SUB_OPTIONS[mobility]?.length ?? 0) > 0 && (
                <>
                  <Text style={styles.breadcrumbSep}>›</Text>
                  <Text style={[styles.breadcrumbItem, mobilityEchelon !== '0' && styles.breadcrumbItemAnswered]}>
                    {MOBILITY_SUB_OPTIONS[mobility]?.find(o => o.value === mobilityEchelon)?.label ?? 'Type'}
                  </Text>
                </>
              )}
            </View>

            {mobility === null && (
              <View style={styles.gridSection}>
                <View style={styles.gridRow}>
                  {MOBILITY_TYPE_OPTIONS.map(opt => (
                    <DomainTile
                      key={`mobility-${opt.value}`}
                      label={opt.label}
                      icon={opt.icon}
                      selected={false}
                      disabled={disabledMobilityValues.has(opt.value)}
                      onPress={() => { setMobility(opt.value); setMobilityEchelon('0'); setEchelonGroup('0'); setEchelon(null); }}
                    />
                  ))}
                </View>
              </View>
            )}

            {mobility !== null && (MOBILITY_SUB_OPTIONS[mobility]?.length ?? 0) > 0 && (
              <View style={styles.gridSection}>
                <View style={styles.gridRow}>
                  {(MOBILITY_SUB_OPTIONS[mobility] ?? []).map(opt => (
                    <EntityTypeTile
                      key={opt.value}
                      label={opt.label}
                      sidc={patchSIDC(patchSIDC(sidc, 9, mobility), 10, opt.value)}
                      selected={mobilityEchelon === opt.value}
                      onPress={() => setMobilityEchelon(opt.value)}
                      colorMode={colorMode}
                      fillMode={fillMode}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>

          <View style={styles.gridSection}>
            <Text style={styles.gridCategoryHeading}>Headquarters / Task Force / Feint / Dummy</Text>
            <View style={styles.gridRow}>
              {[
                HQTFFD_OPTIONS[0],
                ...HQTFFD_OPTIONS.slice(1).sort((a, b) => a.label.localeCompare(b.label)),
              ].map(opt => (
                <EntityTypeTile
                  key={opt.value}
                  label={opt.label}
                  sidc={patchSIDC(sidc, 8, opt.value)}
                  selected={hqtffd === opt.value}
                  onPress={() => setHqtffd(opt.value)}
                  colorMode={colorMode}
                  fillMode={fillMode}
                />
              ))}
            </View>
          </View>

          <View style={styles.gridSection}>
            <Text style={styles.gridCategoryHeading}>Status</Text>
            <View style={styles.gridRow}>
              {STATUS_OPTIONS.map((opt, i) => (
                <EntityTypeTile
                  key={i}
                  label={opt.label}
                  sidc={patchSIDC(sidc, 7, opt.value)}
                  selected={status === opt.value && simpleStatusModifier === (opt.simpleStatusModifier ?? false)}
                  onPress={() => { setStatus(opt.value); setSimpleStatusModifier(opt.simpleStatusModifier ?? false); }}
                  colorMode={colorMode}
                  fillMode={fillMode}
                  simpleStatusModifier={opt.simpleStatusModifier ?? false}
                />
              ))}
            </View>
          </View>

          <View style={styles.gridSection}>
            <Text style={styles.gridCategoryHeading}>Engagement Bar</Text>
            <TextInput
              style={styles.engagementBarInput}
              placeholder="Enter bar text…"
              value={engagementBarText}
              onChangeText={text => {
                setEngagementBarText(text);
                if (!text) setEngagementType('');
              }}
              autoCapitalize="characters"
            />
            <View style={[styles.gridRow, { marginTop: 12 }]}>
              {ENGAGEMENT_TYPE_OPTIONS.map(opt => (
                <EntityTypeTile
                  key={opt.value || 'none'}
                  label={opt.label}
                  sidc={sidc}
                  selected={engagementType === opt.value}
                  onPress={() => setEngagementType(opt.value)}
                  colorMode={colorMode}
                  fillMode={fillMode}
                  disabled={!engagementBarText}
                  engagementBar={engagementBarText}
                  engagementType={opt.value}
                />
              ))}
            </View>
          </View>

        </View>

        <SIDCDisplay sidc={sidc} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
  },
  aliasControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto' as any,
    display: 'none',
  },
  aliasLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#687076',
  },
  aliasInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    fontSize: 13,
    color: '#11181C',
    width: 160,
    backgroundColor: '#fff',
  },
  aliasButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 7,
  },
  aliasButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  aliasButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
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
    maxHeight: 300,
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
  downloadRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  downloadButtonText: { fontSize: 13, color: '#11181C', fontWeight: '600' },
  topDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#D1D5DB',
    alignSelf: 'stretch',
    marginHorizontal: 16,
  },
  affiliationWrapper: { paddingTop: 4 },
  affiliationHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#687076',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  affiliationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
  placeholderText: { fontSize: 15, color: '#9CA3AF', fontStyle: 'italic' },
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
  tileDisabled: {
    opacity: 0.35,
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
  engagementBarInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: '#11181C',
    backgroundColor: '#fff',
  },
});

import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── License data ──────────────────────────────────────────────────────────────

type LicenseEntry = {
  packages: string[];
  license: string;
  text: string;
};

const MIT_BODY = `Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

const mit = (copyright: string) => `The MIT License (MIT)\n\n${copyright}\n\n${MIT_BODY}`;

const APACHE2 = `Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.

   "License" shall mean the terms and conditions for use, reproduction, and distribution as defined by Sections 1 through 9 of this document.

   "Licensor" shall mean the copyright owner or entity authorized by the copyright owner that is granting the License.

   "Legal Entity" shall mean the union of the acting entity and all other entities that control, are controlled by, or are under common control with that entity. For the purposes of this definition, "control" means (i) the power, direct or indirect, to cause the direction or management of such entity, whether by contract or otherwise, or (ii) ownership of fifty percent (50%) or more of the outstanding shares, or (iii) beneficial ownership of such entity.

   "You" (or "Your") shall mean an individual or Legal Entity exercising permissions granted by this License.

   "Source" form shall mean the preferred form for making modifications, including but not limited to software source code, documentation source, and configuration files.

   "Object" form shall mean any form resulting from mechanical transformation or translation of a Source form, including but not limited to compiled object code, generated documentation, and conversions to other media types.

   "Work" shall mean the work of authorship, whether in Source or Object form, made available under the License, as indicated by a copyright notice that is included in or attached to the work.

   "Derivative Works" shall mean any work, whether in Source or Object form, that is based on (or derived from) the Work and for which the editorial revisions, annotations, elaborations, or other modifications represent, as a whole, an original work of authorship.

   "Contribution" shall mean any work of authorship, including the original version of the Work and any modifications or additions to that Work or Derivative Works thereof, that is intentionally submitted to the Licensor for inclusion in the Work.

   "Contributor" shall mean the Licensor and any individual or Legal Entity on behalf of whom a Contribution has been received by the Licensor and subsequently incorporated within the Work.

2. Grant of Copyright License. Subject to the terms and conditions of this License, each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable copyright license to reproduce, prepare Derivative Works of, publicly display, publicly perform, sublicense, and distribute the Work and such Derivative Works in Source or Object form.

3. Grant of Patent License. Subject to the terms and conditions of this License, each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable (except as stated in this section) patent license to make, have made, use, offer to sell, sell, import, and otherwise transfer the Work, where such license applies only to those patent claims licensable by such Contributor that are necessarily infringed by their Contribution(s) alone or by combination of their Contribution(s) with the Work to which such Contribution(s) was submitted.

4. Redistribution. You may reproduce and distribute copies of the Work or Derivative Works thereof in any medium, with or without modifications, and in Source or Object form, provided that You meet the following conditions:

   (a) You must give any other recipients of the Work or Derivative Works a copy of this License; and

   (b) You must cause any modified files to carry prominent notices stating that You changed the files; and

   (c) You must retain, in the Source form of any Derivative Works that You distribute, all copyright, patent, trademark, and attribution notices from the Source form of the Work, excluding those notices that do not pertain to any part of the Derivative Works; and

   (d) If the Work includes a "NOTICE" text file as part of its distribution, then any Derivative Works that You distribute must include a readable copy of the attribution notices contained within such NOTICE file, in at least one of the following places: within a NOTICE text file distributed as part of the Derivative Works; within the Source form or documentation, if provided along with the Derivative Works; or, within a display generated by the Derivative Works, if and wherever such third-party notices normally appear.

5. Submission of Contributions. Unless You explicitly state otherwise, any Contribution intentionally submitted for inclusion in the Work by You to the Licensor shall be under the terms and conditions of this License, without any additional terms or conditions.

6. Trademarks. This License does not grant permission to use the trade names, trademarks, service marks, or product names of the Licensor, except as required for reasonable and customary use in describing the origin of the Work and reproducing the content of the NOTICE file.

7. Disclaimer of Warranty. Unless required by applicable law or agreed to in writing, Licensor provides the Work (and each Contributor provides its Contributions) on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied, including, without limitation, any warranties or conditions of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A PARTICULAR PURPOSE. You are solely responsible for determining the appropriateness of using or redistributing the Work and assume any risks associated with Your exercise of permissions under this License.

8. Limitation of Liability. In no event and under no legal theory, whether in tort (including negligence), contract, or otherwise, unless required by applicable law (such as deliberate and grossly negligent acts) or agreed to in writing, shall any Contributor be liable to You for damages, including any direct, indirect, special, incidental, or consequential damages of any character arising as a result of this License or out of the use or inability to use the Work, even if such Contributor has been advised of the possibility of such damages.

9. Accepting Warranty or Additional Liability. While redistributing the Work or Derivative Works thereof, You may choose to offer, and charge a fee for, acceptance of support, warranty, indemnity, or other liability obligations and/or rights consistent with this License. However, in accepting such obligations, you may act only on your own behalf and on your sole responsibility, not on behalf of any other Contributor, and only if you agree to indemnify, defend, and hold each Contributor harmless for any liability incurred by, or claims asserted against, such Contributor by reason of your accepting any such warranty or additional liability.

END OF TERMS AND CONDITIONS

Copyright 2017 Kirollos Risk

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.`;

const LICENSES: LicenseEntry[] = [
  {
    packages: ['milsymbol'],
    license: 'MIT',
    text: mit('Copyright (c) 2017 Måns Beckman — www.spatialillusions.com'),
  },
  {
    packages: ['fuse.js'],
    license: 'Apache-2.0',
    text: APACHE2,
  },
  {
    packages: ['flag-icons'],
    license: 'MIT',
    text: mit('Copyright (c) 2013 Panayiotis Lipiridis'),
  },
  {
    packages: ['react', 'react-dom', 'react-native'],
    license: 'MIT',
    text: mit('Copyright (c) Meta Platforms, Inc. and affiliates.'),
  },
  {
    packages: ['react-native-svg'],
    license: 'MIT',
    text: mit('Copyright (c) 2015–2016 Horcrux'),
  },
  {
    packages: ['react-native-web'],
    license: 'MIT',
    text: mit('Copyright (c) Nicolas Gallagher.\nCopyright (c) Meta Platforms, Inc. and affiliates.'),
  },
  {
    packages: ['react-native-safe-area-context'],
    license: 'MIT',
    text: mit('Copyright (c) 2019 Th3rd Wave'),
  },
  {
    packages: ['react-native-screens'],
    license: 'MIT',
    text: mit('Copyright (c) 2018 Software Mansion <swmansion.com>'),
  },
  {
    packages: ['react-native-gesture-handler', 'react-native-reanimated'],
    license: 'MIT',
    text: mit('Copyright (c) 2016 Software Mansion <swmansion.com>'),
  },
  {
    packages: ['@expo/vector-icons'],
    license: 'MIT',
    text: mit('Copyright (c) 2015 Joel Arvidsson\nCopyright (c) 2020 650 Industries'),
  },
  {
    packages: [
      'expo',
      'expo-constants',
      'expo-font',
      'expo-haptics',
      'expo-image',
      'expo-linking',
      'expo-router',
      'expo-splash-screen',
      'expo-status-bar',
      'expo-symbols',
      'expo-system-ui',
      'expo-web-browser',
    ],
    license: 'MIT',
    text: mit('Copyright (c) 2015 650 Industries, Inc.'),
  },
  {
    packages: [
      '@react-navigation/native',
      '@react-navigation/bottom-tabs',
      '@react-navigation/elements',
    ],
    license: 'MIT',
    text: mit('Copyright (c) 2017 React Navigation Contributors'),
  },
];

// ── LicenseCard ───────────────────────────────────────────────────────────────

function LicenseCard({ entry }: { entry: LicenseEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={entry.packages.join(', ')}
        accessibilityState={{ expanded }}
        aria-expanded={expanded}
        accessibilityHint="Shows or hides license text"
      >
        <View style={styles.cardHeaderLeft}>
          {entry.packages.map(pkg => (
            <Text key={pkg} style={styles.packageName}>{pkg}</Text>
          ))}
        </View>
        <View style={styles.cardHeaderRight}>
          <View style={[styles.badge, entry.license === 'Apache-2.0' && styles.badgeApache]}>
            <Text style={styles.badgeText}>{entry.license}</Text>
          </View>
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>
      {expanded && (
        <Text style={styles.licenseText} selectable>{entry.text}</Text>
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>About</Text>
        <Link href="/" dismissTo asChild>
          <TouchableOpacity
            style={styles.closeButton}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.appName}>EzMilSymbol</Text>
        <Text style={styles.appDesc}>
          A NATO military symbol builder for APP-6E / MIL-STD-2525E.
          Browse, configure, and export symbols with full control over
          affiliation, domain, echelon, status, modifiers, and more.
        </Text>

        <Text style={styles.sectionHeading}>Open Source Libraries</Text>
        <Text style={styles.sectionNote}>
          Tap an entry to expand its license text.
        </Text>

        {LICENSES.map((entry, i) => (
          <LicenseCard key={i} entry={entry} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D5DB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
    flex: 1,
  },
  closeButton: {
    // 44x44 is the WCAG 2.5.5 minimum touch target; react-native-web doesn't
    // implement hitSlop (no DOM/CSS equivalent), so the actual box has to be
    // this size rather than relying on an invisible expanded hit area.
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    color: '#687076',
  },
  body: {
    padding: 16,
    paddingBottom: 40,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 8,
  },
  appDesc: {
    fontSize: 14,
    color: '#687076',
    lineHeight: 20,
    marginBottom: 28,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 4,
  },
  sectionNote: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  cardHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  packageName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#11181C',
    fontFamily: 'monospace',
  },
  badge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeApache: {
    backgroundColor: '#FEF3C7',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  chevron: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  licenseText: {
    fontSize: 11,
    color: '#374151',
    lineHeight: 17,
    padding: 12,
    backgroundColor: '#fff',
    fontFamily: 'monospace',
  },
});

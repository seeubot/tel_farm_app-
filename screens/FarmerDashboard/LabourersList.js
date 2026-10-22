import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Card, Button, Surface } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, fontSize, colors, borderRadius } from './styles';

export default function WorkersList({
  selectedLocation,
  selectedRadius,
  workers,          // Combined array of labourers AND contractors
  workerType,       // 'labourers' or 'contractors'
  searchCrop,
  onSearchChange,
  selectedCropFilter,
  onSelectCrop,
  onClearFilter,
  onChangeLocation,
  onOpenSettings,
  onContact,
  isDarkTheme,
  renderWorkerCard, // Function to render each card
}) {
  const themeColors = isDarkTheme ? colors.dark : colors.light;
  const styles = getStyles(themeColors);

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <TouchableOpacity onPress={onChangeLocation} style={styles.iconButton}>
          <MaterialIcons name="arrow-back-ios" size={20} color={themeColors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>AgriAgent</Text>
          <View style={styles.coordBadge}>
            <MaterialIcons name="my-location" size={12} color={themeColors.textSecondary} />
            <Text style={styles.subtitle}>
              {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onOpenSettings} style={styles.iconButton}>
          <MaterialIcons name="tune" size={22} color={themeColors.text} />
        </TouchableOpacity>
      </Surface>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.radiusCard} elevation={0}>
          <MaterialIcons name="explore" size={16} color={themeColors.primary} />
          <Text style={styles.radiusInfo}>
            Searching within a <Text style={styles.boldMetric}>{selectedRadius} km</Text> zone
          </Text>
        </Surface>

        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <MaterialIcons name="group" size={18} color={themeColors.primary} />
            <Text style={styles.statText}>
              {workers.length} {workerType === 'labourers' ? 'Labourer' : 'Contractor'}{workers.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {selectedCropFilter.length > 0 && (
            <TouchableOpacity onPress={onClearFilter} style={styles.clearFilterButton}>
              <MaterialIcons name="close" size={12} color={colors.light.error} />
              <Text style={styles.clearFilterText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        {workers.length === 0 ? (
          <Card style={styles.emptyCard} mode="contained">
            <Card.Content style={styles.emptyContent}>
              <MaterialIcons name="person-search" size={40} color={themeColors.textMuted} />
              <Text style={styles.emptyTitle}>No {workerType === 'labourers' ? 'Labourers' : 'Contractors'} Found</Text>
              <Text style={styles.emptyText}>
                Try increasing the search radius or adjusting filters.
              </Text>
              <Button mode="contained-tonal" onPress={onChangeLocation} style={styles.emptyButton} labelStyle={styles.emptyBtnLabel}>
                Expand Search
              </Button>
            </Card.Content>
          </Card>
        ) : (
          workers.map((worker, index) => renderWorkerCard(worker, index))
        )}
        
        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const getStyles = (themeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: themeColors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: themeColors.surface, height: 64 },
  iconButton: { padding: spacing.sm, borderRadius: borderRadius.md },
  headerTextContainer: { flex: 1, marginLeft: spacing.xs, justifyContent: 'center' },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: themeColors.text },
  coordBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  subtitle: { fontSize: fontSize.xs - 1, color: themeColors.textSecondary, marginLeft: 4, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  radiusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.surfaceVariant || '#F1F5F9', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.xs },
  radiusInfo: { fontSize: fontSize.sm, color: themeColors.text, marginLeft: spacing.sm },
  boldMetric: { fontWeight: '700', color: themeColors.primary },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  statsBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, marginVertical: spacing.xs },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statText: { fontSize: fontSize.sm, color: themeColors.textSecondary, marginLeft: spacing.xs, fontWeight: '600' },
  clearFilterButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: borderRadius.sm, gap: 4 },
  clearFilterText: { fontSize: fontSize.xs, color: colors.light.error, fontWeight: '700' },
  emptyCard: { borderRadius: borderRadius.lg, backgroundColor: themeColors.surface, paddingVertical: spacing.xl, borderWidth: 1, borderColor: themeColors.border },
  emptyContent: { alignItems: 'center', paddingHorizontal: spacing.md },
  emptyTitle: { fontSize: fontSize.md, fontWeight: '700', color: themeColors.text, marginBottom: spacing.xs },
  emptyText: { fontSize: fontSize.sm, color: themeColors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl },
  emptyButton: { borderRadius: borderRadius.md, width: '100%' },
  emptyBtnLabel: { fontWeight: '700', fontSize: fontSize.sm },
  bottomSpace: { height: spacing.xxl },
});
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../utils/theme';

export default function AreaResultCard({ 
  area, 
  perimeter, 
  pointsCount, 
  formattedArea, 
  areaUnit, 
  formattedPerimeter,
  onReset 
}) {
  const { colors } = useTheme();

  const styles = getStyles(colors);

  return (
    <View style={styles.resultCard}>
      <Text style={styles.resultTitle}>Measurement Result</Text>
      
      <View style={styles.resultRow}>
        <View style={styles.resultItem}>
          <MaterialIcons name="crop-free" size={24} color={colors.primary} />
          <Text style={styles.resultLabel}>Total Area</Text>
          <Text style={styles.resultValue}>{formattedArea}</Text>
          <Text style={styles.resultUnit}>{areaUnit}</Text>
        </View>
        
        <View style={styles.resultDivider} />
        
        <View style={styles.resultItem}>
          <MaterialIcons name="show-chart" size={24} color={colors.primary} />
          <Text style={styles.resultLabel}>Perimeter</Text>
          <Text style={styles.resultValue}>{formattedPerimeter}</Text>
          <Text style={styles.resultUnit}>Length</Text>
        </View>
      </View>
      
      <View style={styles.infoRow}>
        <MaterialIcons name="info-outline" size={16} color={colors.textMuted} />
        <Text style={styles.infoText}>
          Calculated from {pointsCount} boundary points
        </Text>
      </View>
      
      <TouchableOpacity style={styles.resetButton} onPress={onReset}>
        <MaterialIcons name="refresh" size={18} color={colors.primary} />
        <Text style={styles.resetButtonText}>New Measurement</Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultItem: {
    alignItems: 'center',
    flex: 1,
  },
  resultLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },
  resultValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 4,
  },
  resultUnit: {
    fontSize: 11,
    color: colors.textMuted,
  },
  resultDivider: {
    width: 1,
    height: 50,
    backgroundColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
  },
  resetButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
});
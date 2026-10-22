import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Card, Avatar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../utils/theme';

export default function ProduceCard({ produce, onPress }) {
  const { colors, isDarkTheme } = useTheme();

  const farmerName = produce.farmerId?.profile?.name || 'Farmer';
  const isVerified = produce.farmerId?.verification?.isVerified || false;
  const farmerRating = produce.farmerId?.ratings?.average || 0;

  const styles = getStyles(colors, isDarkTheme);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.card}>
        <Card.Content>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.farmerInfo}>
              <Avatar.Text size={40} label={farmerName.charAt(0)} style={styles.avatar} />
              <View>
                <Text style={styles.farmerName}>{farmerName}</Text>
                <View style={styles.ratingRow}>
                  <MaterialIcons name="star" size={12} color="#FFB300" />
                  <Text style={styles.ratingText}>{farmerRating}</Text>
                </View>
              </View>
            </View>
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="verified" size={12} color="#FFF" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>

          {/* Crop Info */}
          <View style={styles.cropContainer}>
            <View style={styles.cropIcon}>
              <MaterialIcons name="eco" size={32} color={colors.primary} />
            </View>
            <View style={styles.cropDetails}>
              <Text style={styles.cropName}>{produce.cropName}</Text>
              <Text style={styles.teluguName}>{produce.teluguName || ''}</Text>
              <Text style={styles.variety}>{produce.variety || 'Local Variety'}</Text>
            </View>
          </View>

          {/* Price & Quantity */}
          <View style={styles.priceRow}>
            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>Price</Text>
              <Text style={styles.priceValue}>₹{produce.price}</Text>
              <Text style={styles.priceUnit}>{produce.priceUnit || 'per quintal'}</Text>
            </View>
            <View style={styles.quantityBox}>
              <Text style={styles.quantityLabel}>Available</Text>
              <Text style={styles.quantityValue}>{produce.quantity}</Text>
              <Text style={styles.quantityUnit}>{produce.unit || 'kg'}</Text>
            </View>
          </View>

          {/* Organic Badge */}
          {produce.organic && (
            <View style={styles.organicBadge}>
              <MaterialIcons name="eco" size={12} color="#4CAF50" />
              <Text style={styles.organicText}>Certified Organic</Text>
            </View>
          )}

          {/* Action Button */}
          <TouchableOpacity style={styles.viewButton} onPress={onPress}>
            <Text style={styles.viewButtonText}>View Details</Text>
            <MaterialIcons name="arrow-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const getStyles = (colors, isDarkTheme) => StyleSheet.create({
  card: { borderRadius: 16, marginBottom: 12, backgroundColor: colors.cardBg, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  farmerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { backgroundColor: colors.primary },
  farmerName: { fontSize: 14, fontWeight: '600', color: colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  ratingText: { fontSize: 10, color: '#FFB300' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, gap: 2 },
  verifiedText: { fontSize: 9, color: '#FFF', fontWeight: '500' },
  cropContainer: { flexDirection: 'row', marginBottom: 16 },
  cropIcon: { width: 50, height: 50, borderRadius: 12, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cropDetails: { flex: 1 },
  cropName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  teluguName: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  variety: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  priceRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  priceBox: { flex: 1, backgroundColor: colors.primaryLight, borderRadius: 12, padding: 10, alignItems: 'center' },
  priceLabel: { fontSize: 10, color: colors.textMuted },
  priceValue: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  priceUnit: { fontSize: 9, color: colors.textMuted },
  quantityBox: { flex: 1, backgroundColor: colors.inputBg, borderRadius: 12, padding: 10, alignItems: 'center' },
  quantityLabel: { fontSize: 10, color: colors.textMuted },
  quantityValue: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  quantityUnit: { fontSize: 9, color: colors.textMuted },
  organicBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 4, marginBottom: 12 },
  organicText: { fontSize: 10, color: '#4CAF50', fontWeight: '500' },
  viewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  viewButtonText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
});
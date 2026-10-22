import React, { useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card, Avatar, Chip, Divider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

export default function LabourerCard({ labourer, isDarkTheme = false }) {
  
  // Memoize theme definitions to block unnecessary component re-allocations
  const themeColors = useMemo(() => (
    isDarkTheme ? {
      cardBg: '#1E1E1E',
      text: '#E0E0E0',
      textSecondary: '#B0B0B0',
      textMuted: '#888888',
      border: '#2C2C2C',
      primary: '#4CAF50',
      primaryLight: '#2C2C2C',
      chipBg: '#2C2C2C',
      chipText: '#B0B0B0',
      priceBg: '#2C2C2C',
    } : {
      cardBg: '#FFFFFF',
      text: '#333333',
      textSecondary: '#666666',
      textMuted: '#999999',
      border: '#E0E0E0',
      primary: '#2E7D32',
      primaryLight: '#E8F5E9',
      chipBg: '#F0F4F0',
      chipText: '#2E7D32',
      priceBg: '#E8F5E9',
    }
  ), [isDarkTheme]);

  // Compute stylesheet using layout variables
  const styles = useMemo(() => getDynamicStyles(themeColors), [themeColors]);

  // Handle voice call click events natively
  const handleCallPress = useCallback(() => {
    Alert.alert(
      "Connecting Call",
      `Demo: Initiating masked secure call via Twilio to ${labourer.phone}`,
      [{ text: "OK" }]
    );
  }, [labourer.phone]);

  return (
    <Card style={styles.card} elevation={1}>
      <Card.Content style={styles.cardPadding}>
        {/* Profile Card Header Block */}
        <View style={styles.header}>
          <Avatar.Text 
            size={48} 
            label={labourer.avatar || '?'} 
            style={styles.avatar} 
            labelStyle={styles.avatarLabel} 
          />
          <View style={styles.info}>
            <View style={styles.nameContainer}>
              <Text style={styles.name} numberOfLines={1}>{labourer.name}</Text>
              {labourer.teluguName && (
                <Text style={styles.teluguName} numberOfLines={1}>{labourer.teluguName}</Text>
              )}
            </View>
            
            {/* Metadata Badges Array */}
            <View style={styles.badgeRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{labourer.role || 'Labourer'}</Text>
              </View>
              <View style={styles.ratingRow}>
                <MaterialIcons name="star" size={12} color="#FFB300" />
                <Text style={styles.ratingText}>{labourer.rating?.toFixed(1) || '0.0'}</Text>
              </View>
              {labourer.verified && (
                <View style={styles.verifiedBadge}>
                  <MaterialIcons name="verified" size={12} color={themeColors.primary} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Agricultural Crops Tag Array */}
        <View style={styles.cropSection}>
          <Text style={styles.cropLabel}>Crop Expertise</Text>
          <View style={styles.cropChips}>
            {labourer.cropExpertise?.slice(0, 3).map((crop) => (
              <Chip 
                key={crop} 
                style={styles.cropChip}
                textStyle={styles.chipText}
                compact
              >
                {crop}
              </Chip>
            ))}
            {labourer.cropExpertise?.length > 3 && (
              <Chip 
                style={styles.cropChip}
                textStyle={styles.chipText}
                compact
              >
                +{labourer.cropExpertise.length - 3} More
              </Chip>
            )}
          </View>
        </View>

        {/* Functional Footer Control Module */}
        <View style={styles.footer}>
          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>Rate</Text>
            <Text style={styles.priceValue}>₹{labourer.pricePerHour || 75}</Text>
            <Text style={styles.priceUnit}>/hr</Text>
          </View>
          
          <View style={styles.distanceBox}>
            <MaterialIcons name="location-on" size={14} color={themeColors.textSecondary} />
            <Text style={styles.distanceText}>{labourer.distance || '0'} km away</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.callButton} 
            onPress={handleCallPress}
            activeOpacity={0.8}
          >
            <MaterialIcons name="call" size={14} color="#FFFFFF" />
            <Text style={styles.callButtonText}>Contact</Text>
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Card>
  );
}

// Global Static Dynamic Stylesheet Builder
const getDynamicStyles = (colors) => StyleSheet.create({
  card: {
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPadding: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: colors.primary,
    marginRight: 12,
  },
  avatarLabel: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 16,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  nameContainer: {
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
  },
  teluguName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 11,
    color: '#FFB300',
    marginLeft: 3,
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 10,
    color: colors.primary,
    marginLeft: 3,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 12,
    backgroundColor: colors.border,
    height: 1,
  },
  cropSection: {
    marginBottom: 12,
  },
  cropLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cropChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cropChip: {
    backgroundColor: colors.chipBg,
    height: 26,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 11,
    color: colors.chipText,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.priceBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginRight: 4,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  priceUnit: {
    fontSize: 10,
    color: colors.textSecondary,
    marginLeft: 1,
  },
  distanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
    fontWeight: '600',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    elevation: 1,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
  },
});
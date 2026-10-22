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

export default function EquipmentCard({ equipment, onPress }) {
  const { colors, isDarkTheme } = useTheme();

  const styles = getStyles(colors, isDarkTheme);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <Avatar.Text
              size={50}
              label={equipment.name.charAt(0)}
              style={styles.avatar}
            />
            <View style={styles.info}>
              <Text style={styles.name}>{equipment.name}</Text>
              <Text style={styles.teluguName}>{equipment.teluguName || ''}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{equipment.category}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.description} numberOfLines={2}>
            {equipment.description}
          </Text>

          <View style={styles.footer}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Rent</Text>
              <Text style={styles.priceValue}>₹{equipment.pricing?.perDay}</Text>
              <Text style={styles.priceUnit}>/day</Text>
            </View>
            <View style={styles.depositContainer}>
              <Text style={styles.depositLabel}>Deposit</Text>
              <Text style={styles.depositValue}>₹{equipment.pricing?.deposit}</Text>
            </View>
          </View>

          {!equipment.availability?.isAvailable && (
            <View style={styles.unavailableOverlay}>
              <Text style={styles.unavailableText}>Not Available</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const getStyles = (colors, isDarkTheme) => StyleSheet.create({
  card: { borderRadius: 16, marginBottom: 12, backgroundColor: colors.cardBg, elevation: 2 },
  header: { flexDirection: 'row', marginBottom: 12 },
  avatar: { backgroundColor: colors.primary, marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  teluguName: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  categoryBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start', marginTop: 6 },
  categoryText: { fontSize: 10, color: colors.primary, fontWeight: '500' },
  description: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline', backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  priceLabel: { fontSize: 10, color: colors.textMuted, marginRight: 2 },
  priceValue: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  priceUnit: { fontSize: 9, color: colors.textMuted, marginLeft: 2 },
  depositContainer: { backgroundColor: colors.inputBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  depositLabel: { fontSize: 10, color: colors.textMuted },
  depositValue: { fontSize: 14, fontWeight: '500', color: colors.text },
  unavailableOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  unavailableText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
});
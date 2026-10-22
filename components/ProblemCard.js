import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Card, Avatar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../utils/theme';

const { width } = Dimensions.get('window');

export default function ProblemCard({ problem, onPress, onUpvote }) {
  const { colors, isDarkTheme } = useTheme();

  const formatTime = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const styles = getStyles(colors, isDarkTheme);

  return (
    <TouchableOpacity onPress={() => onPress(problem)} activeOpacity={0.8}>
      <Card style={styles.card}>
        <Card.Content>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <Avatar.Text
                size={40}
                label={problem.farmerName.charAt(0)}
                style={styles.avatar}
              />
              <View>
                <Text style={styles.farmerName}>{problem.farmerName}</Text>
                <Text style={styles.teluguName}>{problem.farmerTeluguName}</Text>
              </View>
            </View>
            <Text style={styles.time}>{formatTime(problem.timestamp)}</Text>
          </View>

          {/* Badges */}
          <View style={styles.badgeRow}>
            <View style={styles.cropBadge}>
              <MaterialIcons name="eco" size={12} color={colors.primary} />
              <Text style={styles.cropText}>{problem.cropType}</Text>
            </View>
            <View style={styles.locationBadge}>
              <MaterialIcons name="location-on" size={12} color={colors.textMuted} />
              <Text style={styles.locationText}>{problem.location}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{problem.title}</Text>
          <Text style={styles.teluguTitle}>{problem.teluguTitle}</Text>

          {/* Description */}
          <Text style={styles.description} numberOfLines={2}>
            {problem.description}
          </Text>

          {/* Media Type Indicator */}
          {problem.type !== 'text' && (
            <View style={styles.mediaIndicator}>
              <MaterialIcons
                name={problem.type === 'image' ? 'image' : 'video-library'}
                size={16}
                color={colors.primary}
              />
              <Text style={styles.mediaText}>
                {problem.type === 'image' ? 'Image attached' : 'Video attached'}
              </Text>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.upvoteButton}
              onPress={() => onUpvote(problem.id)}
            >
              <MaterialIcons name="thumb-up" size={18} color={colors.textMuted} />
              <Text style={styles.upvoteText}>{problem.upvotes}</Text>
            </TouchableOpacity>

            <View style={styles.solutionButton}>
              <MaterialIcons name="chat" size={18} color={colors.primary} />
              <Text style={styles.solutionText}>{problem.solutionCount} solutions</Text>
            </View>

            <TouchableOpacity style={styles.shareButton}>
              <MaterialIcons name="share" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const getStyles = (colors, isDarkTheme) => StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: colors.cardBg,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    backgroundColor: colors.primary,
  },
  farmerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  teluguName: {
    fontSize: 11,
    color: colors.textMuted,
  },
  time: {
    fontSize: 10,
    color: colors.textMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  cropBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  cropText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '500',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  teluguTitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  mediaIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  mediaText: {
    fontSize: 11,
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.inputBg,
  },
  upvoteText: {
    fontSize: 12,
    color: colors.text,
  },
  solutionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  solutionText: {
    fontSize: 12,
    color: colors.primary,
  },
  shareButton: {
    padding: 6,
  },
});
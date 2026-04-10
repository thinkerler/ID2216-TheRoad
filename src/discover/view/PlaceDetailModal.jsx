import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Colors } from '../../shared/theme/colors';

export function PlaceDetailModal({ place, detail, detailStatus, onClose }) {
  if (!place) return null;

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet}>
        {place.imageUrl ? (
          <Image source={{ uri: place.imageUrl }} style={styles.hero} />
        ) : null}

        <Pressable style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close">
          <Text style={styles.closeBtnIcon}>✕</Text>
        </Pressable>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.name}>{detail?.name ?? place.name}</Text>
          <Text style={styles.address}>
            {detail?.address ?? place.country}
          </Text>

          {detail?.rating ? (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingIcon}>★</Text>
              <Text style={styles.ratingValue}>{detail.rating.toFixed(1)}</Text>
              {detail.ratingCount ? (
                <Text style={styles.ratingCount}>
                  ({detail.ratingCount.toLocaleString()} reviews)
                </Text>
              ) : null}
            </View>
          ) : null}

          {detailStatus === 'loading' ? (
            <ActivityIndicator color={Colors.primary} style={styles.spinner} />
          ) : null}

          {detail?.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.sectionBody}>{detail.description}</Text>
            </View>
          ) : place.whyVisit ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Why visit</Text>
              <Text style={styles.sectionBody}>{place.whyVisit}</Text>
            </View>
          ) : null}

          {detail?.openingHours?.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Opening Hours</Text>
              {detail.openingHours.map((line, i) => (
                <Text key={i} style={styles.hoursLine}>{line}</Text>
              ))}
            </View>
          ) : null}

          {detail?.website ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Website</Text>
              <Text style={styles.website} numberOfLines={1}>{detail.website}</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  hero: {
    width: '100%',
    height: 240,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(10,14,26,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeBtnIcon: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  address: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  ratingIcon: {
    fontSize: 16,
    color: Colors.warning,
  },
  ratingValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  ratingCount: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  spinner: {
    marginVertical: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  sectionBody: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  hoursLine: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  website: {
    fontSize: 14,
    color: Colors.primary,
  },
});

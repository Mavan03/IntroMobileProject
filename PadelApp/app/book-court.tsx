import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { PADEL_CLUBS } from '../data/clubs'; // Zorg dat dit pad klopt

const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
};

export default function ClubsList() {
  const router = useRouter();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sortedClubs, setSortedClubs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          setErrorMsg('Locatie geweigerd. Clubs staan in willekeurige volgorde.');
          setSortedClubs([...PADEL_CLUBS].sort(() => Math.random() - 0.5));
          setIsLoading(false);
          return;
        }

        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);

        const userLat = currentLocation.coords.latitude;
        const userLng = currentLocation.coords.longitude;

        const distanceSortedClubs = [...PADEL_CLUBS].sort((a, b) => {
          const distA = parseFloat(getDistanceInKm(userLat, userLng, a.lat, a.lng));
          const distB = parseFloat(getDistanceInKm(userLat, userLng, b.lat, b.lng));
          return distA - distB;
        });

        setSortedClubs(distanceSortedClubs);
      } catch (error) {
        setErrorMsg('Fout bij zoeken locatie. Willekeurige volgorde.');
        setSortedClubs([...PADEL_CLUBS].sort(() => Math.random() - 0.5));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const renderClubCard = ({ item }: { item: any }) => {
    const distance = location
      ? getDistanceInKm(location.coords.latitude, location.coords.longitude, item.lat, item.lng)
      : '?';

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push(`/bookdetail/${item.id}` as any)} // Koppeling naar detailscherm
      >
        <Image source={{ uri: item.image }} style={styles.cardImage} />
        <View style={styles.cardInfo}>
          <Text style={styles.clubName}>{item.name}</Text>
          <Text style={styles.distanceText}>📍 {distance} km van jou</Text>
          <Text style={styles.tapText}>Tik om uren te zien en te boeken 👉</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Terug</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Padelclubs</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Locatie zoeken & sorteren...</Text>
        </View>
      ) : (
        <>
          {errorMsg && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>{errorMsg}</Text>
            </View>
          )}
          <FlatList
            data={sortedClubs}
            keyExtractor={(item) => item.id}
            renderItem={renderClubCard}
            contentContainerStyle={styles.listContainer}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingTop: 50, paddingBottom: 15, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  backButton: { position: 'absolute', left: 20, bottom: 15 },
  backButtonText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  warningBox: { backgroundColor: '#ffe6e6', padding: 10, margin: 15, borderRadius: 8 },
  warningText: { color: 'red', textAlign: 'center', fontWeight: 'bold' },
  listContainer: { padding: 15 },
  card: { backgroundColor: '#fff', borderRadius: 15, marginBottom: 20, overflow: 'hidden', elevation: 4 },
  cardImage: { width: '100%', height: 180, resizeMode: 'cover' },
  cardInfo: { padding: 15 },
  clubName: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  distanceText: { fontSize: 16, color: '#666', fontWeight: '600' },
  tapText: { fontSize: 12, color: '#007AFF', marginTop: 8, fontWeight: '600' }
});
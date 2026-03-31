import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ImageBackground, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router'; 
import { Ionicons } from '@expo/vector-icons'; 
import * as Location from 'expo-location';

import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';

// Importeer hier je centrale lijst (zorg dat het pad klopt met jouw mappenstructuur)
// import { PADEL_CLUBS } from '../constants/Clubs'; 

// Voor nu laat ik de lijst hier even staan zodat de code direct werkt:
const PADEL_CLUBS = [
  { id: '1', name: 'Ter Eiken Padel', lat: 51.1542, lng: 4.4531, image: 'https://padelstart.nl/wp-content/uploads/2021/02/pacma-belgie-1.jpg' },
  { id: '2', name: 'Garrincha Antwerpen', lat: 51.2277, lng: 4.4116, image: 'https://www.garrincha.be/assets/front/images/opengraph/garrincha.jpg' },
  { id: '3', name: 'Padelclub de Uitkijk', lat: 51.1856, lng: 4.4283, image: 'https://static.wixstatic.com/media/f5002f_66a73f90dfb14e448c3a96484f31b98f~mv2.jpg/v1/fill/w_774,h_500,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/DJI_0106.jpg' },
  { id: '4', name: 'Vibora', lat: 51.2132, lng: 4.4011, image: 'https://res.cloudinary.com/playtomic/image/upload/v1668870986/pro/tenants/80d478aa-3f50-4bb8-9ee2-9e3ea84ac051/1668870985772.jpg' },
  { id: '5', name: 'Arenal Antwerpen', lat: 51.1950, lng: 4.3812, image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQfN80qoMKhwiu32fWharIjj6pIUbWRFvZ9nQ&s' },
];

const parseDateToTime = (dateStr: string) => {
  try {
    const parts = dateStr.match(/\d+/g);
    if (!parts || parts.length < 3) return 0;
    const day = parseInt(parts[0], 10), month = parseInt(parts[1], 10) - 1, year = parseInt(parts[2], 10);
    const hours = parts[3] ? parseInt(parts[3], 10) : 0, minutes = parts[4] ? parseInt(parts[4], 10) : 0;
    return new Date(year, month, day, hours, minutes).getTime();
  } catch (e) { return 0; }
};

const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180), dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
};

const Dashboard: React.FC = () => {
  const router = useRouter(); 
  const [firstName, setFirstName] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [myMatches, setMyMatches] = useState<any[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState<boolean>(false);
  const [closestClub, setClosestClub] = useState<any>(PADEL_CLUBS[0]);
  const [closestDistance, setClosestDistance] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let loc = await Location.getCurrentPositionAsync({});
          let minDistance = Infinity, foundClub = PADEL_CLUBS[0];
          PADEL_CLUBS.forEach(club => {
            const d = getDistanceInKm(loc.coords.latitude, loc.coords.longitude, club.lat, club.lng);
            if (d < minDistance) { minDistance = d; foundClub = club; }
          });
          setClosestClub(foundClub);
          setClosestDistance(minDistance);
        }
      } catch (e) { console.log(e); }

      if (user) {
        setIsLoggedIn(true);
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) setFirstName(userDoc.data().firstName);
          setIsLoadingMatches(true);
          const querySnapshot = await getDocs(collection(db, 'matches'));
          const matches: any[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.creatorId === user.uid || (data.players && data.players.includes(user.uid))) {
              matches.push({ id: doc.id, ...data });
            }
          });
          const sorted = matches.sort((a, b) => parseDateToTime(a.date) - parseDateToTime(b.date));
          setMyMatches(sorted);
        } catch (error) { console.error(error); } finally { setIsLoadingMatches(false); }
      } else {
        setIsLoggedIn(false);
        setFirstName('');
        setMyMatches([]);
      }
    });
    return () => unsubscribe(); 
  }, []);

  const formatTimeNoSec = (dateStr: string) => {
    const parts = dateStr.split(':');
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : dateStr;
  };

  const handleLogout = () => {
    Alert.alert("Uitloggen", "Bent u zeker dat u wilt uitloggen?", [
      { text: "Annuleren", style: "cancel" },
      { text: "Uitloggen", style: "destructive", onPress: async () => await signOut(auth) }
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. HEADER MET LOGIN KNOP */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Klaar voor een potje?</Text>
          <Text style={styles.title}>{isLoggedIn ? `Hey, ${firstName}` : 'Padel Manager'}</Text>
        </View>
        
        <View style={styles.authButtons}>
          {isLoggedIn ? (
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={28} color="#D8000C" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. DYNAMISCHE HERO CARD */}
      <TouchableOpacity style={styles.heroCard} onPress={() => router.push('/book-court')}>
        <ImageBackground source={{ uri: closestClub.image }} style={styles.heroImage} imageStyle={{ borderRadius: 20 }}>
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>Speel vandaag nog! 🎾</Text>
            <Text style={styles.heroSubtitle}>
              {closestDistance ? `Dichtstbijzijnde club: ${closestClub.name} op ${closestDistance}km 📍` : "Vind een club in de buurt 📍"}
            </Text>
          </View>
        </ImageBackground>
      </TouchableOpacity>

      {/* 3. SNELLE ACTIES */}
      <Text style={styles.sectionTitle}>Snelle acties</Text>
      <View style={styles.grid}>
        <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/find-match')}>
          <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}><Ionicons name="search" size={28} color="#2196F3" /></View>
          <Text style={styles.gridTitle}>Zoek match</Text>
          <Text style={styles.gridDesc}>Speel op jouw niveau</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/create-match')}>
          <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}><Ionicons name="add-circle" size={28} color="#4CAF50" /></View>
          <Text style={styles.gridTitle}>Maak match</Text>
          <Text style={styles.gridDesc}>Stel een team samen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/book-court')}>
          <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}><Ionicons name="calendar" size={28} color="#FF9800" /></View>
          <Text style={styles.gridTitle}>Veld boeken</Text>
          <Text style={styles.gridDesc}>Reserveer direct</Text>
        </TouchableOpacity>
      </View>

      {/* 4. MIJN MATCHES */}
      {isLoggedIn && (
        <View style={styles.myMatchesSection}>
          <Text style={styles.sectionTitle}>Mijn geplande matches</Text>
          {isLoadingMatches ? <ActivityIndicator color="#4CAF50" /> : myMatches.length === 0 ? (
            <View style={styles.emptyCard}><Text>Je hebt nog geen matches gepland. 🎾</Text></View>
          ) : myMatches.map(match => (
            <TouchableOpacity key={match.id} style={styles.matchCard} onPress={() => router.push(`/match/${match.id}`)}>
              <View style={styles.matchMainInfo}>
                <Text style={styles.matchClub}>{match.club}</Text>
                <Text style={styles.matchDate}>📅 {formatTimeNoSec(match.date)}</Text>
                <View style={styles.matchDetailsRow}>
                   <Text style={styles.matchLevel}>Niveau: {match.minLevel} - {match.maxLevel}</Text>
                   <Text style={styles.matchType}>{match.isCompetitive ? "🏆 Competitief" : "🎾 Recreatief"}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 60, marginBottom: 25 },
  greeting: { fontSize: 14, color: '#6c757d', fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '900', color: '#1a1a1a' },
  authButtons: { flexDirection: 'row', alignItems: 'center' },
  loginButton: { backgroundColor: '#007AFF', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, elevation: 2 },
  loginButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  logoutButton: { padding: 4 },
  heroCard: { width: '100%', height: 180, marginBottom: 30, elevation: 6 },
  heroImage: { width: '100%', height: '100%', justifyContent: 'flex-end' },
  heroOverlay: { backgroundColor: 'rgba(0,0,0,0.4)', padding: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  heroSubtitle: { color: '#f1f1f1', fontSize: 14 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '47%', backgroundColor: '#fff', padding: 15, borderRadius: 16, marginBottom: 15, elevation: 2 },
  iconContainer: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  gridTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  gridDesc: { fontSize: 12, color: '#888' },
  myMatchesSection: { marginTop: 10 },
  matchCard: { backgroundColor: '#fff', padding: 18, borderRadius: 16, marginBottom: 12, borderLeftWidth: 5, borderLeftColor: '#4CAF50', elevation: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  matchMainInfo: { flex: 1 },
  matchClub: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  matchDate: { fontSize: 14, fontWeight: '600', color: '#007AFF', marginBottom: 8 },
  matchDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginRight: 10 },
  matchLevel: { fontSize: 13, color: '#666' },
  matchType: { fontSize: 13, color: '#888', fontStyle: 'italic' },
  emptyCard: { padding: 30, alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' }
});

export default Dashboard;
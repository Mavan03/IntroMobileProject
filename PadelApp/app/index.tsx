import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ImageBackground, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router'; 
import { Ionicons } from '@expo/vector-icons'; 
import * as Location from 'expo-location';

import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { PADEL_CLUBS } from '../data/clubs';

const parseDateToTime = (dateStr: string) => {
  try {
    if (!dateStr) return 0;
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
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [closestClub, setClosestClub] = useState<any>(PADEL_CLUBS[0]);
  const [closestDistance, setClosestDistance] = useState<number | null>(null);

  const fetchData = async (user: any) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) setFirstName(userDoc.data().firstName);

      const matchSnap = await getDocs(collection(db, 'matches'));
      const matches = matchSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const userMatches = matches
        .filter((m) => (m.creatorId === user.uid || m.players?.includes(user.uid)) && m.status !== 'played')
        .sort((a, b) => parseDateToTime(a.date) - parseDateToTime(b.date));
      setMyMatches(userMatches);

      const bookingSnap = await getDocs(query(collection(db, 'bookings'), where('userId', '==', user.uid)));
      const bookings = bookingSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      const sortedBookings = bookings.sort((a, b) => {
        const timeA = parseDateToTime(`${a.displayDate} ${a.displayTime}`);
        const timeB = parseDateToTime(`${b.displayDate} ${b.displayTime}`);
        return timeA - timeB;
      });
      
      setMyBookings(sortedBookings);
    } catch (error) {
      console.error(error);
    }
  };

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
        setIsLoading(true);
        await fetchData(user);
        setIsLoading(false);
      } else {
        setIsLoggedIn(false);
        setMyMatches([]);
        setMyBookings([]);
      }
    });
    return () => unsubscribe(); 
  }, []);

  const handleCancelBooking = (bookingId: string) => {
    Alert.alert(
      "Reservering annuleren",
      "Weet je zeker dat je deze reservering wilt verwijderen?",
      [
        { text: "Nee", style: "cancel" },
        { 
          text: "Ja, annuleer", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "bookings", bookingId));
              setMyBookings(prev => prev.filter(b => b.id !== bookingId));
              Alert.alert("Geannuleerd", "Je reservering is verwijderd.");
            } catch (e) {
              Alert.alert("Fout", "Kon de reservering niet annuleren.");
            }
          }
        }
      ]
    );
  };

  const formatTimeNoSec = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split(':');
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : dateStr;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Klaar voor een potje?</Text>
          <Text style={styles.title}>{isLoggedIn ? `Hey, ${firstName}` : 'Padel manager'}</Text>
        </View>
        <View style={styles.headerActions}>
          {!isLoggedIn ? (
            <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
              <Text style={styles.loginBtnText}>Login</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/profile')}>
                <Ionicons name="person-circle-outline" size={32} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => signOut(auth)}>
                <Ionicons name="log-out-outline" size={28} color="#D8000C" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.heroCard} onPress={() => router.push('/book-court')}>
        <ImageBackground source={{ uri: closestClub.image }} style={styles.heroImage} imageStyle={{ borderRadius: 20 }}>
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>Speel vandaag nog! 🎾</Text>
            <Text style={styles.heroSubtitle}>{closestDistance ? `${closestClub.name} op ${closestDistance} km 📍` : "Zoek een club"}</Text>
          </View>
        </ImageBackground>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Snelle acties</Text>
      <View style={styles.grid}>
        <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/find-match')}>
          <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}><Ionicons name="search" size={26} color="#2196F3" /></View>
          <Text style={styles.gridTitle}>Zoek match</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/create-match')}>
          <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}><Ionicons name="add-circle" size={26} color="#4CAF50" /></View>
          <Text style={styles.gridTitle}>Maak match</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/book-court')}>
          <View style={[styles.iconBox, { backgroundColor: '#FFF3E0' }]}><Ionicons name="calendar" size={26} color="#FF9800" /></View>
          <Text style={styles.gridTitle}>Veld boeken</Text>
        </TouchableOpacity>
      </View>

      {isLoggedIn && (
        <>
          <Text style={styles.sectionTitle}>Mijn geplande matches</Text>
          {isLoading ? (
            <ActivityIndicator color="#4CAF50" />
          ) : myMatches.length > 0 ? (
            myMatches.map(match => (
              <TouchableOpacity key={match.id} style={styles.matchCard} onPress={() => router.push(`/match/${match.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardClub}>{match.club}</Text>
                  <Text style={styles.cardDate}>📅 {formatTimeNoSec(match.date)}</Text>
                  <View style={styles.statusRow}>
                    <Text style={[styles.playerCount, match.players?.length === 4 && styles.fullText]}>
                      👥 {match.players?.length}/4 spelers
                    </Text>
                    {match.players?.length === 4 && <Text style={styles.readyTag}> • Klaar</Text>}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>Geen matches gepland.</Text>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Mijn veldreserveringen</Text>
          {myBookings.length > 0 ? (
            myBookings.map(booking => (
              <View key={booking.id} style={[styles.matchCard, { borderLeftColor: '#FF9800' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardClub}>{booking.clubName}</Text>
                  <Text style={styles.cardDate}>🕒 {booking.displayDate} om {booking.displayTime}</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => handleCancelBooking(booking.id)}
                  style={styles.cancelBtn}
                >
                  <Ionicons name="trash-outline" size={22} color="#D8000C" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Geen velden gereserveerd.</Text>
          )}
        </>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 60, marginBottom: 25 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 15 },
  greeting: { fontSize: 14, color: '#6c757d' },
  title: { fontSize: 26, fontWeight: '900' },
  loginBtn: { backgroundColor: '#007AFF', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
  loginBtnText: { color: '#fff', fontWeight: 'bold' },
  heroCard: { width: '100%', height: 180, marginBottom: 30 },
  heroImage: { flex: 1, justifyContent: 'flex-end' },
  heroOverlay: { backgroundColor: 'rgba(0,0,0,0.4)', padding: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  heroSubtitle: { color: '#f1f1f1', fontSize: 13 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 15, marginTop: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '31%', backgroundColor: '#fff', padding: 12, borderRadius: 16, marginBottom: 15, elevation: 2, alignItems: 'center' },
  iconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  gridTitle: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  matchCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 5, borderLeftColor: '#4CAF50', elevation: 1 },
  cardClub: { fontSize: 16, fontWeight: 'bold' },
  cardDate: { color: '#007AFF', fontSize: 13, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  playerCount: { fontSize: 12, color: '#666' },
  fullText: { color: '#4CAF50', fontWeight: 'bold' },
  readyTag: { fontSize: 12, color: '#4CAF50', fontWeight: 'bold' },
  emptyText: { color: '#999', fontStyle: 'italic', marginLeft: 5 },
  cancelBtn: { padding: 5, marginLeft: 10 }
});

export default Dashboard; 
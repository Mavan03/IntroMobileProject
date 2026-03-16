import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ImageBackground, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router'; 
import { Ionicons } from '@expo/vector-icons'; 

import { onAuthStateChanged, signOut } from 'firebase/auth';
// NIEUW: collection en getDocs toegevoegd om de matches op te halen!
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';

const Dashboard: React.FC = () => {
  const router = useRouter(); 

  const [firstName, setFirstName] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  
  // NIEUWE STATES VOOR JOUW MATCHES
  const [myMatches, setMyMatches] = useState<any[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        try {
          // 1. Haal de voornaam op
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setFirstName(userDoc.data().firstName);
          } else {
            setFirstName('Speler');
          }

          // 2. Haal JOUW matches op
          setIsLoadingMatches(true);
          const querySnapshot = await getDocs(collection(db, 'matches'));
          const matches: any[] = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Check of jij de maker bent OF in de spelerslijst staat
            if (data.creatorId === user.uid || (data.players && data.players.includes(user.uid))) {
              matches.push({ id: doc.id, ...data });
            }
          });
          
          setMyMatches(matches);

        } catch (error) {
          console.error("Fout bij ophalen data:", error);
          setFirstName('Speler');
        } finally {
          setIsLoadingMatches(false);
        }
      } else {
        setIsLoggedIn(false);
        setFirstName('');
        setMyMatches([]); // Maak lijst leeg als je uitlogt
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe(); 
  }, []);

  const handleLogout = () => {
    Alert.alert(
      "Uitloggen", 
      "Bent u zeker dat u wilt uitloggen?", 
      [
        {
          text: "Annuleren",
          style: "cancel", 
        },
        {
          text: "Uitloggen",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.error("Fout bij uitloggen:", error);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* 1. HEADER SECTIE */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Klaar voor een potje?</Text>
          <Text style={styles.title}>Padel Manager</Text>
        </View>

        <View style={styles.authButtons}>
          {isLoadingAuth ? (
            <ActivityIndicator color="#007AFF" size="small" />
          ) : isLoggedIn ? (
            <View style={styles.loggedInContainer}>
              <Text style={styles.welcomeText}>Welkom, {firstName}!</Text>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Ionicons name="log-out-outline" size={24} color="#D8000C" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity onPress={() => router.push('/login' as any)}>
                <Text style={styles.loginText}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.registerButton} onPress={() => router.push('/register' as any)}>
                <Text style={styles.registerButtonText}>Register</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* 2. HERO CARD */}
      <TouchableOpacity 
        style={styles.heroCard} 
        activeOpacity={0.9} 
        onPress={() => router.push('/book-court' as any)}
      >
        <ImageBackground 
          source={{ uri: 'https://images.unsplash.com/photo-1622228843243-162e245a198a?w=800&q=80' }} 
          style={styles.heroImage}
          imageStyle={{ borderRadius: 20 }}
        >
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>Speel vandaag nog!</Text>
            <Text style={styles.heroSubtitle}>Vind padelclubs bij jou in de buurt 📍</Text>
          </View>
        </ImageBackground>
      </TouchableOpacity>

      {/* 3. SNELLE ACTIES (GRID) */}
      <Text style={styles.sectionTitle}>Snelle Acties</Text>
      
      <View style={styles.grid}>
        <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/find-match' as any)}>
          <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="search" size={28} color="#2196F3" />
          </View>
          <Text style={styles.gridTitle}>Zoek Match</Text>
          <Text style={styles.gridDesc}>Speel op jouw niveau</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/create-match' as any)}>
          <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="add-circle" size={28} color="#4CAF50" />
          </View>
          <Text style={styles.gridTitle}>Maak Match</Text>
          <Text style={styles.gridDesc}>Stel een team samen</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.gridItem} onPress={() => router.push('/book-court' as any)}>
          <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="calendar" size={28} color="#FF9800" />
          </View>
          <Text style={styles.gridTitle}>Veld Boeken</Text>
          <Text style={styles.gridDesc}>Reserveer direct</Text>
        </TouchableOpacity>
      </View>

      {/* 4. NIEUW: JOUW MATCHES SECTIE (ALLEEN ALS JE INGELOGD BENT!) */}
      {isLoggedIn && (
        <View style={styles.myMatchesSection}>
          <Text style={styles.sectionTitle}>Mijn Geplande Matches</Text>
          
          {isLoadingMatches ? (
            <ActivityIndicator color="#4CAF50" size="large" style={{ marginTop: 20 }} />
          ) : myMatches.length === 0 ? (
            <View style={styles.emptyMatchesCard}>
              <Ionicons name="tennisball-outline" size={40} color="#ccc" style={{ marginBottom: 10 }} />
              <Text style={styles.emptyMatchesText}>Je hebt nog geen matches gepland.</Text>
            </View>
          ) : (
            myMatches.map((match) => (
              <View key={match.id} style={styles.myMatchCard}>
                <View style={styles.myMatchHeader}>
                  <Text style={styles.myMatchClub}>{match.club}</Text>
                  <Text style={styles.myMatchDate}>{match.date}</Text>
                </View>
                <View style={styles.myMatchDetails}>
                  <Text style={styles.myMatchLevel}>Niveau: {match.minLevel} - {match.maxLevel}</Text>
                  <Text style={styles.myMatchType}>
                    {match.isCompetitive ? "🏆 Competitief" : "🎾 Recreatief"}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingHorizontal: 20 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 60, marginBottom: 25 },
  greeting: { fontSize: 14, color: '#6c757d', fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '900', color: '#1a1a1a', letterSpacing: -0.5 },
  
  authButtons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loginText: { color: '#007AFF', fontWeight: '700', fontSize: 15 },
  registerButton: { backgroundColor: '#007AFF', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  registerButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  loggedInContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  welcomeText: { fontSize: 15, fontWeight: '700', color: '#333' },
  logoutButton: { padding: 4 },

  heroCard: { width: '100%', height: 180, marginBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
  heroImage: { width: '100%', height: '100%', justifyContent: 'flex-end' },
  heroOverlay: { backgroundColor: 'rgba(0,0,0,0.4)', padding: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  heroSubtitle: { color: '#f1f1f1', fontSize: 14, fontWeight: '500' },

  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 15 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  gridItem: { width: '47%', backgroundColor: '#fff', padding: 15, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 2 },
  iconContainer: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  gridTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 4 },
  gridDesc: { fontSize: 12, color: '#888', fontWeight: '500' },

  // NIEUWE STYLING VOOR JOUW MATCHES
  myMatchesSection: { marginTop: 10 },
  emptyMatchesCard: { backgroundColor: '#fff', padding: 30, borderRadius: 16, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' },
  emptyMatchesText: { color: '#888', fontSize: 15, fontWeight: '500' },
  
  myMatchCard: { backgroundColor: '#fff', padding: 18, borderRadius: 16, marginBottom: 12, borderLeftWidth: 5, borderLeftColor: '#4CAF50', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
  myMatchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  myMatchClub: { fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1 },
  myMatchDate: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
  myMatchDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  myMatchLevel: { fontSize: 14, color: '#666', fontWeight: '500' },
  myMatchType: { fontSize: 14, color: '#888', fontStyle: 'italic' },
});

export default Dashboard;
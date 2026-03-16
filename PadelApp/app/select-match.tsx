import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';

export default function SelectMatch() {
  const router = useRouter();
  const { clubName } = useLocalSearchParams(); // Pakt de clubnaam uit de route
  
  const [myMatches, setMyMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMyMatches = async () => {
      if (!auth.currentUser) {
        Alert.alert("Niet ingelogd", "Log eerst in om je matchen te zien.");
        setIsLoading(false);
        return;
      }

      try {
        // 1. Zoek alle matchen bij deze specifieke club
        const q = query(collection(db, 'matches'), where('club', '==', clubName));
        const querySnapshot = await getDocs(q);
        
        const allMatchesAtClub: any[] = [];
        querySnapshot.forEach((doc) => {
          allMatchesAtClub.push({ id: doc.id, ...doc.data() });
        });

        // 2. Filter alleen de matchen waar JIJ de maker van bent (of in de spelerslijst staat)
        const myFilteredMatches = allMatchesAtClub.filter(match => 
          match.creatorId === auth.currentUser?.uid || 
          (match.players && match.players.includes(auth.currentUser?.uid))
        );

        setMyMatches(myFilteredMatches);
      } catch (error) {
        console.error("Fout bij ophalen matchen:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyMatches();
  }, [clubName]);

  const handleBookCourt = (match: any) => {
    // Hier zou je in een echte app een API call doen naar de club
    Alert.alert(
      "Veld Gereserveerd! 🎉", 
      `Je hebt succesvol een veld geboekt bij ${clubName} voor de match op ${match.date}.`,
      [{ text: "Top!", onPress: () => router.push('/') }]
    );
  };

  const renderMatchCard = ({ item }: { item: any }) => (
    <View style={styles.matchCard}>
      <View style={styles.matchInfo}>
        <Text style={styles.matchDate}>📅 {item.date}</Text>
        <Text style={styles.matchLevel}>Niveau: {item.minLevel} - {item.maxLevel}</Text>
        <Text style={styles.matchType}>
          {item.isCompetitive ? "🏆 Competitief" : "🎾 Recreatief"} | {item.isMixed ? "Gemengd" : "Mannen/Vrouwen apart"}
        </Text>
      </View>
      <TouchableOpacity style={styles.bookButton} onPress={() => handleBookCourt(item)}>
        <Text style={styles.bookButtonText}>Boek Veld</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Terug</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Matchen bij {clubName}</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Jouw matchen ophalen...</Text>
        </View>
      ) : myMatches.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.noMatchesTitle}>Geen matchen gevonden! 😭</Text>
          <Text style={styles.noMatchesText}>Je hebt nog geen match gepland bij {clubName} waar je aan meedoet.</Text>
          <TouchableOpacity style={styles.createButton} onPress={() => router.push('/create-match' as any)}>
            <Text style={styles.createButtonText}>Maak nu een match aan</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={myMatches}
          keyExtractor={(item) => item.id}
          renderItem={renderMatchCard}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingTop: 50, paddingBottom: 15, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', position: 'relative', elevation: 3, zIndex: 1 },
  backButton: { position: 'absolute', left: 20, bottom: 15, zIndex: 2 },
  backButtonText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center', width: '70%' },
  
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  noMatchesTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  noMatchesText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 25 },
  createButton: { backgroundColor: '#4CAF50', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 25 },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  listContainer: { padding: 15 },
  matchCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  matchInfo: { marginBottom: 15 },
  matchDate: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 5 },
  matchLevel: { fontSize: 15, color: '#555', marginBottom: 3 },
  matchType: { fontSize: 14, color: '#888', fontStyle: 'italic' },
  bookButton: { backgroundColor: '#FF9800', padding: 12, borderRadius: 10, alignItems: 'center' },
  bookButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export default function FindMatch() {
  const router = useRouter();
  
  // State voor de wedstrijden en een laad-indicator
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMatches = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'matches'));
      const matchesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMatches(matchesData);
    } catch (error) {
      console.error("fout bij het ophalen van matches:", error);
    } finally {
      setLoading(false);
    }
  };

  // useEffect zorgt ervoor dat fetchMatches direct runt zodra dit scherm opent
  useEffect(() => {
    fetchMatches();
  }, []);

  const renderMatchCard = ({ item }: { item: any }) => {
    // checken hoeveel spelers er al in de array zitten
    const playerCount = item.players ? item.players.length : 0;

    return (
      <View style={styles.card}>
        <Text style={styles.clubName}>{item.club}</Text>
        <Text style={styles.matchInfo}>Datum: {item.date}</Text>
        <Text style={styles.matchInfo}>Niveau: {item.minLevel} - {item.maxLevel}</Text>
        <Text style={styles.matchInfo}>
          Type: {item.isCompetitive ? 'Competitie' : 'Vriendschappelijk'} | {item.isMixed ? 'Gemengd' : 'Enkel geslacht'}
        </Text>
        
        <View style={styles.bottomRow}>
          <Text style={styles.playerCount}>Spelers: {playerCount} / 4</Text>
          
          <TouchableOpacity 
            style={[styles.joinButton, playerCount >= 4 && styles.fullButton]}
            disabled={playerCount >= 4}
            onPress={() => alert(`Je hebt op meedoen geklikt voor match ${item.id}!`)}
          >
            <Text style={styles.joinButtonText}>
              {playerCount >= 4 ? 'Vol' : 'Meedoen'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Terug</Text>
      </TouchableOpacity>
      
      <Text style={styles.header}>Zoek een Wedstrijd</Text>

      {/* Als de data nog laadt, toon een draaiend icoontje */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={renderMatchCard}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={styles.emptyText}>Er zijn nog geen open matches gevonden.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333'
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  clubName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2196F3'
  },
  matchInfo: {
    fontSize: 14,
    color: '#555',
    marginBottom: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  playerCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  joinButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  fullButton: {
    backgroundColor: '#ccc', 
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 20,
    fontSize: 16,
  },
  backButton: {
    marginBottom: 10,
    paddingVertical: 10,
    alignSelf: 'flex-start'
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
});
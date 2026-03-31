import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../../config/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function MatchDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatch = async () => {
      const docSnap = await getDoc(doc(db, 'matches', id as string));
      if (docSnap.exists()) setMatch({ id: docSnap.id, ...docSnap.data() });
      setLoading(false);
    };
    fetchMatch();
  }, [id]);

  const handleJoin = async () => {
    if (!auth.currentUser) return Alert.alert("Fout", "Je moet ingelogd zijn.");
    if (match.players?.includes(auth.currentUser.uid)) return Alert.alert("Info", "Je zit al in deze match.");
    if (match.players?.length >= 4) return Alert.alert("Vol", "Deze match is al volzet.");

    try {
      await updateDoc(doc(db, 'matches', match.id), {
        players: arrayUnion(auth.currentUser.uid)
      });
      Alert.alert("Succes", "Je bent toegevoegd aan de match!");
      router.replace('/');
    } catch (e) { Alert.alert("Fout", "Kon niet deelnemen."); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#4CAF50" /></View>;
  if (!match) return <View style={styles.center}><Text>Match niet gevonden.</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.clubName}>{match.club}</Text>
        <Text style={styles.dateText}>📅 {match.date}</Text>
        <Text style={styles.levelText}>📊 Niveau: {match.minLevel} - {match.maxLevel}</Text>
        <Text style={styles.typeText}>{match.isCompetitive ? '🏆 Competitief' : '🎾 Recreatief'}</Text>

        <View style={styles.separator} />

        <Text style={styles.sectionTitle}>Spelers ({match.players?.length}/4)</Text>
        {match.players?.length === 4 && (
          <View style={styles.fullBadge}><Text style={styles.fullBadgeText}>MATCH VOLZET</Text></View>
        )}

        {/* Hier zou je normaal de namen van de spelers mappen */}
        <Text style={styles.playerInfo}>Maker ID: {match.creatorId}</Text>
        
        {match.players?.length < 4 && !match.players?.includes(auth.currentUser?.uid) && (
          <TouchableOpacity style={styles.joinBtn} onPress={handleJoin}>
            <Text style={styles.joinBtnText}>Deelnemen aan match</Text>
          </TouchableOpacity>
        )}

        {/* KNOP VOOR RESULTAAT INVOEREN (Alleen maker en als 4/4 spelers) */}
        {match.creatorId === auth.currentUser?.uid && match.players?.length === 4 && match.status !== 'played' && (
          <TouchableOpacity 
            style={styles.adminBtn} 
            onPress={() => router.push(`/match-result/${match.id}` as any)}
          >
            <Text style={styles.adminBtnText}>🏆 Resultaat invoeren</Text>
          </TouchableOpacity>
        )}

        {match.status === 'played' && (
          <View style={styles.playedBox}>
            <Text style={styles.playedText}>Uitslag: {match.score}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 20 },
  backBtn: { marginTop: 40, marginBottom: 20 },
  card: { backgroundColor: '#fff', padding: 25, borderRadius: 20, elevation: 3 },
  clubName: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  dateText: { fontSize: 16, color: '#007AFF', marginBottom: 5 },
  levelText: { fontSize: 14, color: '#666' },
  typeText: { fontSize: 14, fontWeight: 'bold', marginTop: 5, color: '#4CAF50' },
  separator: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  fullBadge: { backgroundColor: '#E8F5E9', padding: 10, borderRadius: 8, marginBottom: 15, alignItems: 'center' },
  fullBadgeText: { color: '#4CAF50', fontWeight: 'bold' },
  playerInfo: { color: '#999', fontSize: 12, marginBottom: 20 },
  joinBtn: { backgroundColor: '#4CAF50', padding: 18, borderRadius: 12, alignItems: 'center' },
  joinBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  adminBtn: { backgroundColor: '#333', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  adminBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  playedBox: { backgroundColor: '#f0f0f0', padding: 15, borderRadius: 10, marginTop: 20, alignItems: 'center' },
  playedText: { fontWeight: 'bold', color: '#333' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
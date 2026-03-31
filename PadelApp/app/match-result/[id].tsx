import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../../config/firebaseConfig';

export default function MatchResult() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Score states
  const [s1T1, setS1T1] = useState('');
  const [s1T2, setS1T2] = useState('');
  const [s2T1, setS2T1] = useState('');
  const [s2T2, setS2T2] = useState('');
  const [s3T1, setS3T1] = useState('');
  const [s3T2, setS3T2] = useState('');

  useEffect(() => {
    const fetchMatch = async () => {
      const docSnap = await getDoc(doc(db, 'matches', id as string));
      if (docSnap.exists()) {
        setMatch({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    };
    fetchMatch();
  }, [id]);

  const handleSaveResult = async () => {
    if (!s1T1 || !s1T2 || !s2T1 || !s2T2) {
      Alert.alert("Fout", "Vul minstens de eerste twee sets in.");
      return;
    }

    setIsSaving(true);

    try {
      let t1Sets = 0;
      let t2Sets = 0;

      if (parseInt(s1T1) > parseInt(s1T2)) t1Sets++; else t2Sets++;
      if (parseInt(s2T1) > parseInt(s2T2)) t1Sets++; else t2Sets++;
      if (s3T1 && s3T2) {
        if (parseInt(s3T1) > parseInt(s3T2)) t1Sets++; else t2Sets++;
      }

      const winner = t1Sets > t2Sets ? 'team1' : 'team2';
      const team1Ids = [match.players[0], match.players[1]];
      const team2Ids = [match.players[2], match.players[3]];

      // Update match
      await updateDoc(doc(db, 'matches', id as string), {
        status: 'played',
        score: `${s1T1}-${s1T2}, ${s2T1}-${s2T2}${s3T1 ? `, ${s3T1}-${s3T2}` : ''}`,
        winner: winner
      });

      // Level algoritme (alleen bij competitief)
      if (match.isCompetitive) {
        const winners = winner === 'team1' ? team1Ids : team2Ids;
        const losers = winner === 'team1' ? team2Ids : team1Ids;

        for (const uid of winners) {
          await updateDoc(doc(db, 'users', uid), { level: increment(0.15) });
        }
        for (const uid of losers) {
          await updateDoc(doc(db, 'users', uid), { level: increment(-0.10) });
        }
      }

      Alert.alert("Succes", "Resultaat opgeslagen en levels bijgewerkt!");
      router.replace('/');
    } catch (e) {
      Alert.alert("Fout", "Opslaan mislukt.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#4CAF50" /></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Resultaat invoeren</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.matchInfo}>{match.club} • {match.date}</Text>
        
        <View style={styles.tableHeader}>
          <Text style={styles.teamCol}>Teams</Text>
          <Text style={styles.setCol}>S1</Text>
          <Text style={styles.setCol}>S2</Text>
          <Text style={styles.setCol}>S3</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.teamName}>Team 1</Text>
          <TextInput style={styles.scoreInput} keyboardType="numeric" value={s1T1} onChangeText={setS1T1} placeholder="0" placeholderTextColor="#999" />
          <TextInput style={styles.scoreInput} keyboardType="numeric" value={s2T1} onChangeText={setS2T1} placeholder="0" placeholderTextColor="#999" />
          <TextInput style={styles.scoreInput} keyboardType="numeric" value={s3T1} onChangeText={setS3T1} placeholder="-" placeholderTextColor="#999" />
        </View>

        <View style={styles.row}>
          <Text style={styles.teamName}>Team 2</Text>
          <TextInput style={styles.scoreInput} keyboardType="numeric" value={s1T2} onChangeText={setS1T2} placeholder="0" placeholderTextColor="#999" />
          <TextInput style={styles.scoreInput} keyboardType="numeric" value={s2T2} onChangeText={setS2T2} placeholder="0" placeholderTextColor="#999" />
          <TextInput style={styles.scoreInput} keyboardType="numeric" value={s3T2} onChangeText={setS3T2} placeholder="-" placeholderTextColor="#999" />
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, isSaving && styles.disabled]} 
          onPress={handleSaveResult}
          disabled={isSaving}
        >
          <Text style={styles.saveBtnText}>{isSaving ? 'Laden...' : 'Bevestig uitslag'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  back: { fontSize: 24, fontWeight: 'bold', marginRight: 15 },
  title: { fontSize: 20, fontWeight: 'bold' },
  card: { backgroundColor: '#f9f9f9', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#eee' },
  matchInfo: { textAlign: 'center', color: '#666', marginBottom: 20 },
  tableHeader: { flexDirection: 'row', marginBottom: 10 },
  teamCol: { flex: 2, fontWeight: 'bold' },
  setCol: { flex: 1, textAlign: 'center', fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  teamName: { flex: 2, fontWeight: '600' },
  scoreInput: { flex: 1, backgroundColor: '#fff', marginHorizontal: 5, padding: 10, borderRadius: 8, textAlign: 'center', borderWidth: 1, borderColor: '#ddd', color: '#000' },
  saveBtn: { backgroundColor: '#4CAF50', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  disabled: { backgroundColor: '#ccc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
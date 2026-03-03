import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router'; 
const Dashboard: React.FC = () => {
  const router = useRouter(); 

  const banners = [
    { id: '/create-match', title: '1. Wedstrijd Aanmaken', color: '#4CAF50', description: 'Stel een match op voor 4 spelers' },
    { id: '/book-court', title: '2. Veld Boeken', color: '#2196F3', description: 'Reserveer direct een veld' },
    { id: '/find-match', title: '3. Wedstrijd Zoeken', color: '#FF9800', description: 'Zoek matches op niveau' },
    { id: '/messages', title: '4. Berichten', color: '#9C27B0', description: 'Chat met je teamgenoten' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Padel Manager</Text>
      
      {banners.map((item) => (
        <TouchableOpacity 
          key={item.id}
          style={[styles.banner, { backgroundColor: item.color }]}
          onPress={() => router.push(item.id as any)} 
          activeOpacity={0.8}
        >
          <View>
            <Text style={styles.bannerTitle}>{item.title}</Text>
            <Text style={styles.bannerDesc}>{item.description}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, backgroundColor: '#f5f5f5', flex: 1 },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  banner: { padding: 25, borderRadius: 16, marginBottom: 15, elevation: 4 },
  bannerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  bannerDesc: { color: '#fff', fontSize: 14, opacity: 0.9, marginTop: 4 }
});

export default Dashboard;
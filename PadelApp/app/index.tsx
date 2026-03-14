import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router'; 

const Dashboard: React.FC = () => {
  const router = useRouter(); 

  const banners = [
    { id: '/create-match', title: '1. Wedstrijd Aanmaken', color: '#4CAF50', description: 'Stel een match op voor 4 spelers' },
    { id: '/book-court', title: '2. Veld Boeken', color: '#2196F3', description: 'Reserveer direct een veld' },
    { id: '/find-match', title: '3. Wedstrijd Zoeken', color: '#FF9800', description: 'Zoek matches op niveau' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      <View style={styles.topBar}>
        <Text style={styles.header}>Padel Manager</Text>
        
        <TouchableOpacity 
          style={styles.registerButton} 
          onPress={() => router.push('/register' as any)}
        >
          <Text style={styles.registerButtonText}>Register</Text>
        </TouchableOpacity>
      </View>
      
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
  container: { 
    padding: 20, 
    paddingTop: 60, 
    backgroundColor: '#f5f5f5', 
    flex: 1 
  },
  

  topBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
    width: '100%',
  },
  header: { 
    fontSize: 28, 
    fontWeight: 'bold',
    color: '#333'
  },
  
  registerButton: {
    position: 'absolute',
    right: 0,
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  registerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  banner: { 
    padding: 25, 
    borderRadius: 16, 
    marginBottom: 15, 
    elevation: 4 
  },
  bannerTitle: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  bannerDesc: { 
    color: '#fff', 
    fontSize: 14, 
    opacity: 0.9, 
    marginTop: 4 
  }
});

export default Dashboard;
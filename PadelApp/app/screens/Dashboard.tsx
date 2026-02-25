import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';

// scherm heeft navigatie-eigenschappen
type DashboardProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Dashboard'>;
};

// hoe Banner eruit ziet
interface Banner {
  id: keyof RootStackParamList; 
  title: string;
  color: string;
  description: string;
}

const Dashboard: React.FC<DashboardProps> = ({ navigation }) => {
  
  const banners: Banner[] = [
    { 
      id: 'CreateMatch', 
      title: '1. Wedstrijd Aanmaken', 
      color: '#4CAF50', 
      description: 'Stel een match op voor 4 spelers (Niveau 0,5 - 7)'
    },
    { 
      id: 'BookCourt', 
      title: '2. Veld Boeken', 
      color: '#2196F3', 
      description: 'Reserveer direct een veld bij een club' 
    },
    { 
      id: 'FindMatch', 
      title: '3. Wedstrijd Zoeken', 
      color: '#FF9800', 
      description: 'Zoek matches op basis van jouw niveau' 
    },
    { 
      id: 'Messages', 
      title: '4. Berichten', 
      color: '#9C27B0', 
      description: 'Chat met je teamgenoten' 
    },
  ];

  return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Padel Manager</Text>
        
        {banners.map((item) => (
          <TouchableOpacity 
            key={item.id}
            style={[styles.banner, { backgroundColor: item.color }]}
            // Navigeer naar het scherm dat bij de ID hoort
            onPress={() => navigation.navigate(item.id)}
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
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { padding: 20 },
  header: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 30, 
    color: '#333',
    textAlign: 'center' 
  },
  banner: {
    padding: 25,
    borderRadius: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  bannerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  bannerDesc: { color: '#fff', fontSize: 14, opacity: 0.9, marginTop: 4 }
});

export default Dashboard;
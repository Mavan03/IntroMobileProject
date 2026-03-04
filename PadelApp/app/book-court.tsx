import { useRouter } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function BookCourt() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Terug</Text>
      </TouchableOpacity>
      <Text style={styles.text}>Book court screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: '#fff',
    padding: 20,
  },
  text: {
    fontSize: 20,
  },
  backButton: {
    marginBottom: 20,
    paddingVertical: 10,
    alignSelf: 'flex-start'
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
});
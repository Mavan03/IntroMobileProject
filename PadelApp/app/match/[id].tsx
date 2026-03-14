import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "../../config/firebaseConfig";

export default function MatchDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const currentUser = auth.currentUser;

  const [matchInfo, setMatchInfo] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Hiermee kunnen we de chat automatisch naar beneden laten scrollen
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;

    // 1. Wedstrijd info ophalen
    const fetchMatchInfo = async () => {
      const matchRef = doc(db, "matches", id as string);
      const docSnap = await getDoc(matchRef);
      if (docSnap.exists()) {
        setMatchInfo(docSnap.data());
      }
    };
    fetchMatchInfo();

    // 2. Haal berichten op van OUD naar NIEUW ('asc' in plaats van 'desc')
    const q = query(
      collection(db, `matches/${id}/chat`),
      orderBy("createdAt", "asc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(chatData);
    });

    return () => unsubscribe();
  }, [id]);

  const sendMessage = async () => {
    if (newMessage.trim() === "" || !currentUser) return;

    try {
      await addDoc(collection(db, `matches/${id}/chat`), {
        text: newMessage,
        senderId: currentUser.uid,
        senderEmail: currentUser.email,
        createdAt: new Date().getTime(),
      });
      setNewMessage("");
    } catch (error) {
      console.error("Fout bij versturen:", error);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = currentUser && item.senderId === currentUser.uid;

    return (
      <View
        style={[
          styles.messageContainer,
          isMe ? styles.myMessageContainer : styles.otherMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMe ? styles.myMessage : styles.otherMessage,
          ]}
        >
          <Text style={styles.sender}>{isMe ? "Ik" : item.senderEmail}</Text>
          <Text style={styles.messageText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  // BEVEILIGING: Check of de ingelogde gebruiker in de players array zit
  const isParticipant = matchInfo?.players?.includes(currentUser?.uid);

  // Als de info is geladen, en je bent geen deelnemer, blokkeer de toegang!
  if (matchInfo && !isParticipant) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Terug</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.deniedContainer}>
          <Text style={styles.deniedText}>🛑 Geen toegang</Text>
          <Text style={styles.deniedSubText}>
            Je kunt deze chat alleen bekijken als je meedoet aan deze wedstrijd.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Terug</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {matchInfo ? matchInfo.club : "Laden..."}
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Text>
          Niveau: {matchInfo?.minLevel} - {matchInfo?.maxLevel}
        </Text>
        <Text>Deelnemers: {matchInfo?.players?.length || 0} / 4</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        // Automatisch naar beneden scrollen bij een nieuw bericht
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={styles.chatContentContainer}
        style={styles.chatArea}
      />

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Typ een bericht..."
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Stuur</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f0f0" },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    elevation: 2,
  },
  backButton: {
    color: "#007AFF",
    fontSize: 16,
    marginRight: 15,
    fontWeight: "bold",
  },
  title: { fontSize: 20, fontWeight: "bold" },
  infoBox: {
    backgroundColor: "#e5f1ff",
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
  },

  // Stijlen voor de 'Toegang Geweigerd' pagina
  deniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  deniedText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#d32f2f",
    marginBottom: 10,
  },
  deniedSubText: { fontSize: 16, color: "#555", textAlign: "center" },

  chatArea: { flex: 1, backgroundColor: "#eaeaea" },
  chatContentContainer: { padding: 15, paddingBottom: 30 },

  messageContainer: { width: "100%", marginBottom: 10, flexDirection: "row" },
  myMessageContainer: { justifyContent: "flex-end" },
  otherMessageContainer: { justifyContent: "flex-start" },

  messageBubble: {
    padding: 12,
    borderRadius: 15,
    maxWidth: "75%",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
  },
  myMessage: { backgroundColor: "#dcf8c6", borderBottomRightRadius: 0 },
  otherMessage: { backgroundColor: "#fff", borderBottomLeftRadius: 0 },
  sender: { fontSize: 11, color: "#888", marginBottom: 4, fontWeight: "bold" },
  messageText: { fontSize: 16, color: "#000" },

  inputArea: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#fff",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: "#fafafa",
  },
  sendButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  sendButtonText: { color: "#fff", fontWeight: "bold" },
});

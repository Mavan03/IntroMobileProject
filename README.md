# Padel Manager

Een mobiele applicatie gebouwd met React Native (Expo) en Firebase door Marwan Bouchdig en Renzo Raes. Deze app stelt padelspelers in staat om matchen te organiseren, medespelers te vinden, real-time te chatten en padelvelden te reserveren.

## Functionaliteiten

- **Authenticatie & Profiel:** Account aanmaken, inloggen en profielbeheer inclusief statistieken en actueel niveau.
- **Clubs & Locatie:** Padelclubs in de buurt vinden op basis van actuele GPS-coördinaten.
- **Matchen Beheren:** Matchen aanmaken (competitief of recreatief) en zoeken via diverse filters.
- **Communicatie:** Real-time groepschat voor deelnemers van een specifieke match.
- **Reserveringen:** Velden boeken inclusief een gesimuleerde betaalflow.
- **Resultaten:** Uitslagen invoeren met automatische niveau-aanpassing (rating) voor spelers bij competitieve matchen.

## Technologieën & Libraries

Naast de standaard React Native-componenten maakt dit project gebruik van de volgende specifieke libraries:

- **Navigatie:** `expo-router`
- **Backend & Database:** `firebase` (Authentication, Firestore, Storage)
- **Locatievoorziening:** `expo-location` (Voor het berekenen van afstanden naar clubs)
- **Media:** `expo-image-picker` (Voor het uploaden van profielfoto's)
- **UI-Componenten:** - `react-native-calendars` (Voor de datumprikker bij velden boeken)
  - `@react-native-community/datetimepicker` (Voor native tijdselectie bij nieuwe matchen)

## Vereisten

Voordat je begint, dien je ervoor te zorgen dat je het volgende hebt geïnstalleerd:

- [Node.js](https://nodejs.org/) (inclusief npm)
- De **Expo Go**-app op je fysieke smartphone (iOS of Android), of een ingestelde iOS Simulator / Android Emulator op je computer.

## Installatie & Setup

**1. Kloon de repository en open de map:**

```bash
git clone <repository-url>
cd padel-manager
```

**2. Installeer alle afhankelijkheden:**
(Dit installeert automatisch alle benodigde packages, zoals expo-location en firebase, vanuit de package.json)

```bash
npm install
```

**3. Firebase Configuratie:**
Maak een .env-bestand aan in de root van het project en voeg je eigen Firebase API-sleutels toe:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=jouw_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=jouw_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=jouw_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=jouw_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=jouw_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=jouw_app_id
```

**4. Start de applicatie:**

```bash
npx expo start
```

Scan vervolgens de gegenereerde QR-code met de camera van je telefoon (of direct in de Expo Go-app) om de applicatie te openen.

import { Modal, Pressable, StyleSheet, Text, View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

type IDPhotoModalProps = {
  visible: boolean;
  onClose: () => void;
  onPickedImage: (uri: string) => void;
};

// Landscape ID card (correct orientation)
function IDCardLandscape() {
  return (
    <View style={idStyles.landscapeCard}>
      <View style={idStyles.photoBox}>
        <Ionicons name="person" size={20} color="#FFB43B" />
      </View>
      <View style={idStyles.linesCol}>
        <View style={idStyles.line} />
        <View style={[idStyles.line, { width: 30 }]} />
        <View style={[idStyles.line, { width: 22 }]} />
      </View>
    </View>
  );
}

// Portrait ID card (acceptable tilt)
function IDCardPortrait() {
  return (
    <View style={[idStyles.portraitCard, { transform: [{ rotate: '-5deg' }] }]}>
      <View style={idStyles.photoBoxPortrait}>
        <Ionicons name="person" size={16} color="#FFB43B" />
      </View>
      <View style={idStyles.line} />
      <View style={[idStyles.line, { width: 28 }]} />
      <View style={[idStyles.line, { width: 20 }]} />
    </View>
  );
}

// Wrong - vertical/upside down
function IDCardWrong() {
  return (
    <View style={[idStyles.portraitCard, { transform: [{ rotate: '90deg' }] }]}>
      <View style={idStyles.photoBoxPortrait}>
        <Ionicons name="person" size={16} color="#FFB43B" />
      </View>
      <View style={idStyles.lineWrong} />
      <View style={idStyles.lineWrong} />
      <View style={idStyles.lineWrong} />
    </View>
  );
}

export function IDPhotoModal({ visible, onClose, onPickedImage }: IDPhotoModalProps) {
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera Permission Needed', 'Please allow camera access in your device settings to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        onPickedImage(result.assets[0].uri);
        onClose();
      }
    } catch (error) {
      console.log('Error taking photo:', error);
      Alert.alert('Camera Error', 'Unable to open camera. You can also tap "Upload Photo" to select a photo from your gallery.');
    }
  };

  const handleUploadPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Gallery Permission Needed', 'Please allow gallery access in your device settings to choose a photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        onPickedImage(result.assets[0].uri);
        onClose();
      }
    } catch (error) {
      console.log('Error uploading photo:', error);
      Alert.alert('Gallery Error', 'Unable to open photo library. Please try again.');
    }
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>How to take an ID photo</Text>
          <Text style={styles.subtitle}>Make sure the ID is right side up.</Text>

          <View style={styles.examplesRow}>
            <View style={styles.example}>
              <IDCardLandscape />
              <Text style={styles.checkGood}>✓</Text>
            </View>

            <View style={styles.example}>
              <IDCardPortrait />
              <Text style={styles.checkGood}>✓</Text>
            </View>

            <View style={styles.example}>
              <IDCardWrong />
              <Text style={styles.checkBad}>✗</Text>
            </View>
          </View>

          <View style={styles.buttonsRow}>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={handleTakePhoto}
            >
              <Text style={styles.primaryBtnText}>Take Photo</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              onPress={handleUploadPhoto}
            >
              <Text style={styles.secondaryBtnText}>Upload Photo</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const idStyles = StyleSheet.create({
  landscapeCard: {
    width: 80,
    height: 52,
    backgroundColor: '#FFB43B',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    gap: 6,
  },
  portraitCard: {
    width: 52,
    height: 72,
    backgroundColor: '#FFB43B',
    borderRadius: 4,
    alignItems: 'center',
    padding: 6,
    gap: 5,
  },
  photoBox: {
    width: 36,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBoxPortrait: {
    width: 30,
    height: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linesCol: {
    flex: 1,
    gap: 5,
    justifyContent: 'center',
  },
  line: {
    height: 4,
    width: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  lineWrong: {
    height: 4,
    width: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 28,
  },
  examplesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 28,
    alignItems: 'flex-end',
  },
  example: {
    alignItems: 'center',
    gap: 10,
  },
  checkGood: {
    color: '#27AE60',
    fontSize: 20,
    fontWeight: '700',
  },
  checkBad: {
    color: '#E74C3C',
    fontSize: 20,
    fontWeight: '700',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  primaryBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFB43B',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFB43B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#FFB43B',
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
});

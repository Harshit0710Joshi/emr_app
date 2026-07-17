import React, { useCallback, useState } from 'react';
import { View, FlatList, Text, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { PatientListItem } from '@components/patient/PatientListItem';
import { colors, typography, spacing } from '@theme/index';
import { PatientRepository } from '@database/repositories/patientRepository';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Patient } from '@models/patient';
import { SyncEngine } from '@sync/syncEngine';
import { getDatabase } from '@database/db';

type Props = NativeStackScreenProps<RootStackParamList, 'PatientList'>;

export const PatientListScreen: React.FC<Props> = ({ navigation }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadPatients = useCallback(async (query: string = '') => {
    setLoading(true);
    try {
      const results = query.trim()
        ? await PatientRepository.search(query.trim())
        : await PatientRepository.getAll();
      setPatients(results);
    } catch (err) {
      console.error('Failed to load patients:', err);
    } finally {
      setLoading(false);
    }
    const db = await getDatabase();
const row = await db.getFirstAsync('SELECT id, first_name, last_name, phone, revision, updated_at, sync_status FROM patients WHERE id = ?;', ['the-patient-id']);
console.log('Phone A local state:', JSON.stringify(row, null, 2));
  }, []);

  // Reload every time this screen comes into focus (e.g. after adding a patient)
  useFocusEffect(
    useCallback(() => {
      loadPatients(searchQuery);
    }, [loadPatients, searchQuery])
  );
  const insets = useSafeAreaInsets();

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    loadPatients(text);
  };
  const handleDebugCheck = async () => {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    'SELECT id, first_name, sync_status, is_deleted, updated_at FROM patients ORDER BY updated_at DESC LIMIT 5;'
  );
  console.log('=== PATIENTS TABLE STATE ===');
  console.log(JSON.stringify(rows, null, 2));
  Alert.alert('Check console', 'Patient sync_status logged to Metro terminal');
};

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await SyncEngine.runFullSync();
      console.log('Sync result:', result);
      Alert.alert('Sync complete', JSON.stringify(result, null, 2));
      loadPatients(searchQuery); // refresh list in case pull brought new/updated data
    } catch (err) {
      console.error('Sync failed:', err);
      Alert.alert('Sync failed', String(err));
    } finally {
      setSyncing(false);
    }
  };



  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Input
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChangeText={handleSearch}
          style={{ marginBottom: 0 }}
        />
      </View>

      <FlatList
        data={patients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PatientListItem
            patient={item}
            onPress={() => navigation.navigate('PatientProfile', { patientId: item.id })}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              {searchQuery ? 'No patients match your search.' : 'No patients yet. Register your first patient below.'}
            </Text>
          ) : null
        }
      />

      <View style={[styles.footer, { paddingBottom: spacing.lg + insets.bottom }]}>
        <Button
  label="Sync Status"
  variant="outline"
  onPress={() => navigation.navigate('SyncDashboard')}
  style={{ marginBottom: spacing.md }}
/>
        
        <Button
  label="Peer Sync"
  variant="outline"
  onPress={() => navigation.navigate('PeerSync')}
  style={{ marginBottom: spacing.md }}
/>


        <Button
          label="+ Register New Patient"
          onPress={() => navigation.navigate('PatientRegistration')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: typography.size.base,
    marginTop: spacing.xxl,
  },
});
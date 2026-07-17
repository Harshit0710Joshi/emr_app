import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { colors, typography } from '@theme/index';
import { RevisionHistoryScreen } from '@screens/RevisionHistoryScreen';

import { PatientListScreen } from '@screens/PatientListScreen';
import { SyncDashboardScreen } from '@screens/SyncDashboardScreen';
import { PatientRegistrationScreen } from '@screens/PatientRegistrationScreen';
import { PeerSyncScreen } from '@screens/PeerSyncScreen';
import { PatientProfileScreen } from '@screens/PatientProfileScreen';
import { VisitHistoryScreen } from '@screens/VisitHistoryScreen';
import { AddEditVisitScreen } from '@screens/AddEditVisitScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="PatientList"
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontWeight: typography.weight.semibold,
            fontSize: typography.size.lg,
          },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
  name="RevisionHistory"
  component={RevisionHistoryScreen}
  options={{ title: 'Revision History' }}
/>
        <Stack.Screen
  name="PeerSync"
  component={PeerSyncScreen}
  options={{ title: 'Peer Sync' }}
/>
        <Stack.Screen
          name="PatientList"
          component={PatientListScreen}
          options={{ title: 'Patients' }}
        />
        <Stack.Screen
          name="PatientRegistration"
          component={PatientRegistrationScreen}
          options={{ title: 'Register Patient' }}
        />
        <Stack.Screen
  name="SyncDashboard"
  component={SyncDashboardScreen}
  options={{ title: 'Sync Status' }}
/>
        <Stack.Screen
          name="PatientProfile"
          component={PatientProfileScreen}
          options={{ title: 'Patient Profile' }}
        />
        <Stack.Screen
          name="VisitHistory"
          component={VisitHistoryScreen}
          options={{ title: 'Visit History' }}
        />
        <Stack.Screen
          name="AddEditVisit"
          component={AddEditVisitScreen}
          options={{ title: 'Visit Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
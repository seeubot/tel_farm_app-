import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export default function BrowserTest() {
  const [result, setResult] = useState(null);

  const testBrowser = async () => {
    try {
      console.log('Testing browser...');
      
      // Test 1: Simple URL without any options
      const result1 = await WebBrowser.openBrowserAsync('https://www.google.com');
      console.log('Test 1 result:', result1);
      setResult(JSON.stringify(result1, null, 2));
      
    } catch (error) {
      console.error('Browser test error:', error);
      Alert.alert('Error', `Browser test failed: ${error.message}`);
      setResult(`Error: ${error.message}`);
    }
  };

  const testAuthSession = async () => {
    try {
      console.log('Testing auth session...');
      
      // Test 2: Auth session without redirect
      const result2 = await WebBrowser.openAuthSessionAsync(
        'https://www.google.com'
      );
      console.log('Test 2 result:', result2);
      setResult(JSON.stringify(result2, null, 2));
      
    } catch (error) {
      console.error('Auth session test error:', error);
      Alert.alert('Error', `Auth session test failed: ${error.message}`);
      setResult(`Error: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Browser Test</Text>
      
      <TouchableOpacity style={styles.button} onPress={testBrowser}>
        <Text style={styles.buttonText}>Test openBrowserAsync</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testAuthSession}>
        <Text style={styles.buttonText}>Test openAuthSessionAsync</Text>
      </TouchableOpacity>
      
      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Result:</Text>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    width: '100%',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
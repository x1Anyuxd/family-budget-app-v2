import React from 'react';
import { StyleSheet, View, ViewProps, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useColors } from '@/hooks/use-colors';

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  containerClassName?: string;
  withSafeArea?: boolean;
}

export function ScreenContainer({ 
  children, 
  style, 
  withSafeArea = true,
  ...props 
}: ScreenContainerProps) {
  const colors = useColors();
  
  const content = (
    <View 
      style={[
        styles.container, 
        { backgroundColor: colors.background },
        style
      ]} 
      {...props}
    >
      {children}
    </View>
  );

  if (withSafeArea && Platform.OS !== 'web') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="dark-content" />
        {content}
      </SafeAreaView>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});

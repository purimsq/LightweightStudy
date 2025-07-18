import { useState, useEffect, useCallback } from "react";
import { useLocalStorage } from "./use-local-storage";

interface StudySession {
  isStudying: boolean;
  studyTime: number; // in minutes
  sessionStartTime: number | null;
  totalStudyTimeToday: number;
  lastBreakTime: number | null;
}

export function useStudySession() {
  const [session, setSession] = useLocalStorage<StudySession>("study-session", {
    isStudying: false,
    studyTime: 0,
    sessionStartTime: null,
    totalStudyTimeToday: 0,
    lastBreakTime: null,
  });

  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  // Calculate study time if session is active
  useEffect(() => {
    if (session.isStudying && session.sessionStartTime) {
      const elapsedMinutes = Math.floor((currentTime - session.sessionStartTime) / (1000 * 60));
      setSession(prev => ({
        ...prev,
        studyTime: elapsedMinutes,
      }));
    }
  }, [currentTime, session.isStudying, session.sessionStartTime, setSession]);

  const startStudySession = useCallback(() => {
    setSession(prev => ({
      ...prev,
      isStudying: true,
      sessionStartTime: Date.now(),
      studyTime: 0,
    }));
  }, [setSession]);

  const endStudySession = useCallback(() => {
    setSession(prev => ({
      ...prev,
      isStudying: false,
      totalStudyTimeToday: prev.totalStudyTimeToday + prev.studyTime,
      sessionStartTime: null,
      studyTime: 0,
    }));
  }, [setSession]);

  const takeBreak = useCallback(() => {
    setSession(prev => ({
      ...prev,
      isStudying: false,
      lastBreakTime: Date.now(),
      totalStudyTimeToday: prev.totalStudyTimeToday + prev.studyTime,
      sessionStartTime: null,
      studyTime: 0,
    }));
  }, [setSession]);

  const resumeStudy = useCallback(() => {
    setSession(prev => ({
      ...prev,
      isStudying: true,
      sessionStartTime: Date.now(),
      studyTime: 0,
    }));
  }, [setSession]);

  const dismissBreakReminder = useCallback(() => {
    // Just update last break time to prevent immediate re-showing
    setSession(prev => ({
      ...prev,
      lastBreakTime: Date.now(),
    }));
  }, [setSession]);

  const resetDailyStats = useCallback(() => {
    setSession(prev => ({
      ...prev,
      totalStudyTimeToday: 0,
      studyTime: 0,
      isStudying: false,
      sessionStartTime: null,
    }));
  }, [setSession]);

  // Check if break reminder should be shown (every 45 minutes for regular study, 90 minutes for weekends)
  const now = new Date();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const breakInterval = isWeekend ? 90 : 45; // 90 minutes on weekends, 45 minutes on weekdays
  
  const shouldShowBreakReminder = session.studyTime > 0 && 
    session.studyTime % breakInterval === 0 && 
    session.studyTime >= breakInterval &&
    session.isStudying;

  return {
    ...session,
    startStudySession,
    endStudySession,
    takeBreak,
    resumeStudy,
    dismissBreakReminder,
    resetDailyStats,
    shouldShowBreakReminder,
    currentSessionTime: session.studyTime,
  };
}

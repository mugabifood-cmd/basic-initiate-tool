import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Subject {
  id: string;
  name: string;
  code: string;
}

export interface ClassSlot {
  className: string;
  stream: string;
}

export interface SubjectAssignment {
  id: string;
  subjectId: string;
  classes: ClassSlot[];
}

export interface ClassAssignment {
  className: string;
  stream: string;
}

export const useTeacherAssignments = (initialSubjectAssignments: SubjectAssignment[] = [], initialClassAssignment: ClassAssignment | null = null) => {
  const [subjectAssignments, setSubjectAssignments] = useState<SubjectAssignment[]>(initialSubjectAssignments);
  const [classAssignment, setClassAssignment] = useState<ClassAssignment | null>(initialClassAssignment);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [streams, setStreams] = useState<string[]>([]);

  useEffect(() => {
    fetchSubjects();
    fetchClassesAndStreams();
  }, []);

  const fetchSubjects = async () => {
    const { data } = await supabase
      .from("subjects")
      .select("id, name, code")
      .order("name");
    if (data) {
      setSubjects(data);
    }
  };

  const fetchClassesAndStreams = async () => {
    const { data } = await supabase
      .from("classes")
      .select("name, stream")
      .order("name");
    
    if (data) {
      const uniqueClasses = Array.from(new Set(data.map(c => c.name))).filter(Boolean);
      const uniqueStreams = Array.from(new Set(data.map(c => c.stream))).filter(Boolean);
      setClasses(uniqueClasses);
      setStreams(uniqueStreams);
    }
  };

  const addSubjectAssignment = () => {
    const newAssignment: SubjectAssignment = {
      id: Date.now().toString(),
      subjectId: "",
      classes: [{ className: "", stream: "" }],
    };
    setSubjectAssignments([...subjectAssignments, newAssignment]);
  };

  const removeSubjectAssignment = (id: string) => {
    setSubjectAssignments(subjectAssignments.filter(sa => sa.id !== id));
  };

  const updateSubjectAssignment = (id: string, subjectId: string) => {
    setSubjectAssignments(subjectAssignments.map(sa =>
      sa.id === id ? { ...sa, subjectId } : sa
    ));
  };

  const updateClassSlot = (assignmentId: string, slotIndex: number, field: keyof ClassSlot, value: string) => {
    setSubjectAssignments(subjectAssignments.map(sa =>
      sa.id === assignmentId
        ? {
            ...sa,
            classes: sa.classes.map((slot, idx) =>
              idx === slotIndex ? { ...slot, [field]: value } : slot
            ),
          }
        : sa
    ));
  };

  const addClassSlot = (assignmentId: string) => {
    setSubjectAssignments(subjectAssignments.map(sa =>
      sa.id === assignmentId
        ? { ...sa, classes: [...sa.classes, { className: "", stream: "" }] }
        : sa
    ));
  };

  const removeClassSlot = (assignmentId: string, slotIndex: number) => {
    setSubjectAssignments(subjectAssignments.map(sa =>
      sa.id === assignmentId
        ? { ...sa, classes: sa.classes.filter((_, idx) => idx !== slotIndex) }
        : sa
    ));
  };

  const getSelectedClassesForAssignment = (assignmentId: string) => {
    const assignment = subjectAssignments.find(sa => sa.id === assignmentId);
    return assignment ? assignment.classes.map(slot => `${slot.className}-${slot.stream}`) : [];
  };

  const isClassDisabledForSlot = (assignmentId: string, slotIndex: number, className: string, stream: string) => {
    const selectedClasses = getSelectedClassesForAssignment(assignmentId);
    const classStreamCombo = `${className}-${stream}`;
    
    // Get the current slot's value to exclude it from the check
    const assignment = subjectAssignments.find(sa => sa.id === assignmentId);
    const currentSlot = assignment?.classes[slotIndex];
    const currentCombo = currentSlot ? `${currentSlot.className}-${currentSlot.stream}` : "";
    
    return selectedClasses.includes(classStreamCombo) && classStreamCombo !== currentCombo;
  };

  const resetAssignments = () => {
    setSubjectAssignments([]);
    setClassAssignment(null);
  };

  const setAssignments = (newSubjectAssignments: SubjectAssignment[], newClassAssignment: ClassAssignment | null) => {
    setSubjectAssignments(newSubjectAssignments);
    setClassAssignment(newClassAssignment);
  };

  return {
    subjectAssignments,
    classAssignment,
    subjects,
    classes,
    streams,
    setClassAssignment,
    addSubjectAssignment,
    removeSubjectAssignment,
    updateSubjectAssignment,
    updateClassSlot,
    addClassSlot,
    removeClassSlot,
    getSelectedClassesForAssignment,
    isClassDisabledForSlot,
    resetAssignments,
    setAssignments,
  };
};
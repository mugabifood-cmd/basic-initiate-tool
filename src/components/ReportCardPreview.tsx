import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface SubjectGrade {
  subject_name: string;
  subject_code: string;
  percentage_100: number;
  grade: string;
  remarks: string;
  teacher_comment: string;
}

interface ReportCardPreviewProps {
  reportId: string;
}

export default function ReportCardPreview({ reportId }: ReportCardPreviewProps) {
  const [reportData, setReportData] = useState<any>(null);
  const [subjectGrades, setSubjectGrades] = useState<SubjectGrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [reportId]);

  const fetchReportData = async () => {
    try {
      // Fetch report card with all relations
      const { data: report, error: reportError } = await supabase
        .from('report_cards')
        .select(`
          *,
          students (
            full_name,
            student_number,
            gender,
            house,
            photo_url
          ),
          classes (
            name,
            stream,
            academic_year,
            term
          )
        `)
        .eq('id', reportId)
        .single();

      if (reportError) throw reportError;

      // Fetch subject submissions
      const { data: submissions, error: submissionsError } = await supabase
        .from('subject_submissions')
        .select(`
          *,
          subjects (
            name,
            code
          )
        `)
        .eq('student_id', report.student_id)
        .eq('class_id', report.class_id)
        .eq('status', 'approved');

      if (submissionsError) throw submissionsError;

      const grades = submissions.map((sub: any) => ({
        subject_name: sub.subjects.name,
        subject_code: sub.subjects.code,
        percentage_100: sub.percentage_100,
        grade: sub.grade,
        remarks: sub.remarks,
        teacher_comment: sub.teacher_comment
      }));

      setReportData(report);
      setSubjectGrades(grades);
    } catch (error: any) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!reportData) {
    return <div className="text-center py-8">Report card not found</div>;
  }

  return (
    <div className="bg-white text-black p-8 max-w-4xl mx-auto" style={{ fontFamily: 'Times New Roman, serif' }}>
      {/* Header */}
      <div className="border-2 border-black p-6 mb-4">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold uppercase">Student Report Card</h1>
          <p className="text-sm mt-2">Academic Year: {reportData.classes.academic_year} | Term: {reportData.classes.term}</p>
        </div>

        {/* Student Information */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <p><strong>Name:</strong> {reportData.students.full_name}</p>
            <p><strong>Student Number:</strong> {reportData.students.student_number}</p>
            <p><strong>Class:</strong> {reportData.classes.name} {reportData.classes.stream}</p>
          </div>
          <div>
            <p><strong>Gender:</strong> {reportData.students.gender}</p>
            <p><strong>House:</strong> {reportData.students.house || 'N/A'}</p>
            <p><strong>Generated:</strong> {reportData.generated_at ? format(new Date(reportData.generated_at), 'dd/MM/yyyy') : 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Subjects Table */}
      <div className="border-2 border-black mb-4">
        <table className="w-full">
          <thead>
            <tr className="border-b border-black">
              <th className="border-r border-black p-2 text-left">Subject</th>
              <th className="border-r border-black p-2 text-center">Code</th>
              <th className="border-r border-black p-2 text-center">Mark (%)</th>
              <th className="border-r border-black p-2 text-center">Grade</th>
              <th className="p-2 text-left">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {subjectGrades.map((subject, index) => (
              <tr key={index} className="border-b border-black">
                <td className="border-r border-black p-2">{subject.subject_name}</td>
                <td className="border-r border-black p-2 text-center">{subject.subject_code}</td>
                <td className="border-r border-black p-2 text-center">{subject.percentage_100?.toFixed(1) || 'N/A'}</td>
                <td className="border-r border-black p-2 text-center">{subject.grade || 'N/A'}</td>
                <td className="p-2">{subject.remarks || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Overall Performance */}
      <div className="border-2 border-black p-4 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>Overall Average:</strong> {reportData.overall_average?.toFixed(1) || 'N/A'}%</p>
            <p><strong>Overall Grade:</strong> {reportData.overall_grade || 'N/A'}</p>
          </div>
          <div>
            <p><strong>Overall Achievement:</strong> {reportData.overall_achievement || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="border-2 border-black p-4 mb-4">
        <div className="mb-4">
          <p className="font-bold mb-2">Class Teacher's Comment:</p>
          <p className="text-sm">{reportData.class_teacher_comment || 'No comment provided'}</p>
        </div>
        <div>
          <p className="font-bold mb-2">Headteacher's Comment:</p>
          <p className="text-sm">{reportData.headteacher_comment || 'No comment provided'}</p>
        </div>
      </div>

      {/* Term Dates & Fees */}
      <div className="border-2 border-black p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>Term Ended On:</strong> {reportData.term_ended_on ? format(new Date(reportData.term_ended_on), 'dd/MM/yyyy') : 'N/A'}</p>
            <p><strong>Next Term Begins:</strong> {reportData.next_term_begins ? format(new Date(reportData.next_term_begins), 'dd/MM/yyyy') : 'N/A'}</p>
          </div>
          <div>
            <p><strong>Fees Balance:</strong> {reportData.fees_balance ? `KSh ${reportData.fees_balance}` : 'N/A'}</p>
            <p><strong>Fees Next Term:</strong> {reportData.fees_next_term ? `KSh ${reportData.fees_next_term}` : 'N/A'}</p>
          </div>
        </div>
        {reportData.other_requirements && (
          <div className="mt-4">
            <p className="font-bold">Other Requirements:</p>
            <p className="text-sm">{reportData.other_requirements}</p>
          </div>
        )}
      </div>

      {/* Signatures */}
      <div className="mt-6 grid grid-cols-3 gap-8">
        <div className="text-center">
          <div className="border-t border-black pt-2 mt-8">
            <p className="text-sm">Class Teacher</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black pt-2 mt-8">
            <p className="text-sm">Headteacher</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black pt-2 mt-8">
            <p className="text-sm">Parent/Guardian</p>
          </div>
        </div>
      </div>
    </div>
  );
}

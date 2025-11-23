import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface SubjectGrade {
  subject_name: string;
  subject_code: string;
  a1_score: number | null;
  a2_score: number | null;
  a3_score: number | null;
  average_score: number | null;
  percentage_20: number | null;
  percentage_80: number | null;
  percentage_100: number;
  identifier: number | null;
  grade: string;
  remarks: string;
  teacher_initials: string;
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
            photo_url,
            school_id,
            age
          ),
          classes (
            name,
            stream,
            academic_year,
            term,
            school_id
          )
        `)
        .eq('id', reportId)
        .single();

      if (reportError) throw reportError;

      // Fetch school information
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('id', report.classes.school_id)
        .single();

      if (schoolError) throw schoolError;

      // Fetch subject submissions with teacher info
      const { data: submissions, error: submissionsError } = await supabase
        .from('subject_submissions')
        .select(`
          *,
          subjects (
            name,
            code
          ),
          profiles!subject_submissions_teacher_id_fkey (
            initials
          )
        `)
        .eq('student_id', report.student_id)
        .eq('class_id', report.class_id)
        .eq('status', 'approved');

      if (submissionsError) throw submissionsError;

      const grades = submissions.map((sub: any) => ({
        subject_name: sub.subjects.name,
        subject_code: sub.subjects.code,
        a1_score: sub.a1_score,
        a2_score: sub.a2_score,
        a3_score: sub.a3_score,
        average_score: sub.average_score,
        percentage_20: sub.percentage_20,
        percentage_80: sub.percentage_80,
        percentage_100: sub.percentage_100,
        identifier: sub.identifier || calculateIdentifier(sub.percentage_100),
        grade: sub.grade,
        remarks: sub.remarks,
        teacher_initials: sub.profiles?.initials || 'N/A'
      }));

      setReportData({ ...report, school });
      setSubjectGrades(grades);
    } catch (error: any) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateIdentifier = (percentage: number): number => {
    if (percentage >= 80) return 3; // Outstanding
    if (percentage >= 70) return 2; // Moderate
    if (percentage >= 40) return 1; // Basic
    return 0; // Below basic
  };

  const getAchievementText = (identifier: number): string => {
    switch (identifier) {
      case 3: return 'Outstanding';
      case 2: return 'Moderate';
      case 1: return 'Basic';
      default: return 'Below Basic';
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
    <div id="report-card-preview" className="bg-white text-black p-6 mx-auto" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', maxWidth: '210mm', width: '100%' }}>
      {/* Header with Logo and Student Photo */}
      <div className="border border-black mb-2">
        <div className="flex items-start justify-between p-3">
          {/* School Logo - Left */}
          <div className="w-20 h-20 flex-shrink-0">
            {reportData.school?.logo_url ? (
              <img src={reportData.school.logo_url} alt="School Logo" className="w-full h-full object-contain border border-gray-300" />
            ) : (
              <div className="w-full h-full bg-gray-100 border border-gray-300 flex items-center justify-center text-xs">
                Logo
              </div>
            )}
          </div>

          {/* School Info - Center */}
          <div className="flex-1 text-center px-4">
            <h1 className="text-xl font-bold text-blue-700 uppercase mb-1">{reportData.school?.name || 'School Name'}</h1>
            {reportData.school?.motto && <p className="text-xs italic text-blue-600 mb-1">"{reportData.school.motto}"</p>}
            <p className="text-xs mb-1">Location: {reportData.school?.location || 'School Address'}</p>
            <p className="text-xs mb-1">P.O BOX: {reportData.school?.po_box || 'Contact Details'}</p>
            <p className="text-xs mb-1">TEL: {reportData.school?.telephone || 'Phone Numbers'}</p>
            <p className="text-xs text-blue-600 mb-1">
              {reportData.school?.email && `Email: ${reportData.school.email}`}
              {reportData.school?.email && reportData.school?.website && ' | '}
              {reportData.school?.website && `Website: ${reportData.school.website}`}
            </p>
            <h2 className="text-lg font-bold text-blue-700 mt-2">TERM {reportData.classes.term?.toUpperCase()} REPORT CARD {reportData.classes.academic_year}</h2>
          </div>

          {/* Student Photo - Right */}
          <div className="w-24 h-28 flex-shrink-0">
            {reportData.students.photo_url ? (
              <img src={reportData.students.photo_url} alt="Student" className="w-full h-full object-cover border border-gray-300" />
            ) : (
              <div className="w-full h-full bg-gray-100 border border-gray-300 flex items-center justify-center text-xs">
                Photo
              </div>
            )}
          </div>
        </div>

        {/* Student Information */}
        <div className="border-t border-black p-2 grid grid-cols-3 gap-x-8 text-xs">
          <div className="flex gap-2">
            <span className="font-bold">NAME:</span>
            <span className="text-blue-700 font-semibold">{reportData.students.full_name.toUpperCase()}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold">GENDER:</span>
            <span className="text-blue-700 font-semibold">{reportData.students.gender?.toUpperCase()}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold">TERM:</span>
            <span className="text-blue-700 font-semibold">{reportData.classes.term?.toUpperCase()}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold">SECTION:</span>
            <span className="text-blue-700 font-semibold">{reportData.classes.stream || 'N/A'}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold">CLASS:</span>
            <span className="text-blue-700 font-semibold">{reportData.classes.name}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold">Printed on</span>
            <span className="text-blue-700 font-semibold">{format(new Date(), 'dd/MM/yyyy')}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold">House</span>
            <span className="text-blue-700 font-semibold">{reportData.students.house || 'N/A'}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold">Age</span>
            <span className="text-blue-700 font-semibold">{reportData.students.age || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Performance Records Header */}
      <div className="text-center bg-blue-700 text-white font-bold py-1 text-sm mb-0">
        PERFORMANCE RECORDS
      </div>

      {/* Subjects Table */}
      <div className="border border-black">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-black bg-gray-50">
              <th className="border-r border-black p-1 text-left font-bold">Code</th>
              <th className="border-r border-black p-1 text-left font-bold">Subject</th>
              <th className="border-r border-black p-1 text-center font-bold">A1</th>
              <th className="border-r border-black p-1 text-center font-bold">A2</th>
              <th className="border-r border-black p-1 text-center font-bold">A3</th>
              <th className="border-r border-black p-1 text-center font-bold">AVG</th>
              <th className="border-r border-black p-1 text-center font-bold">20%</th>
              <th className="border-r border-black p-1 text-center font-bold">80%</th>
              <th className="border-r border-black p-1 text-center font-bold">100%</th>
              <th className="border-r border-black p-1 text-center font-bold">Ident</th>
              <th className="border-r border-black p-1 text-center font-bold">GRADE</th>
              <th className="border-r border-black p-1 text-left font-bold italic">Remarks/Descriptors</th>
              <th className="p-1 text-center font-bold">TR</th>
            </tr>
          </thead>
          <tbody>
            {subjectGrades.map((subject, index) => (
              <tr key={index} className="border-b border-black">
                <td className="border-r border-black p-1 font-bold">{subject.subject_code}</td>
                <td className="border-r border-black p-1 font-bold">{subject.subject_name}</td>
                <td className="border-r border-black p-1 text-center">{subject.a1_score?.toFixed(1) || ''}</td>
                <td className="border-r border-black p-1 text-center">{subject.a2_score?.toFixed(1) || ''}</td>
                <td className="border-r border-black p-1 text-center">{subject.a3_score?.toFixed(1) || ''}</td>
                <td className="border-r border-black p-1 text-center">{subject.average_score?.toFixed(1) || ''}</td>
                <td className="border-r border-black p-1 text-center">{subject.percentage_20 !== null ? Math.round(subject.percentage_20) : ''}</td>
                <td className="border-r border-black p-1 text-center">{subject.percentage_80 !== null ? Math.round(subject.percentage_80) : ''}</td>
                <td className="border-r border-black p-1 text-center">{Math.round(subject.percentage_100)}</td>
                <td className="border-r border-black p-1 text-center">{subject.identifier || ''}</td>
                <td className="border-r border-black p-1 text-center font-bold">{subject.grade || ''}</td>
                <td className="border-r border-black p-1">{subject.remarks || ''}</td>
                <td className="p-1 text-center font-bold">{subject.teacher_initials}</td>
              </tr>
            ))}
            {/* Average Row */}
            <tr className="font-bold bg-gray-50">
              <td colSpan={2} className="border-r border-black p-1">AVERAGE:</td>
              <td className="border-r border-black p-1 text-center"></td>
              <td className="border-r border-black p-1 text-center"></td>
              <td className="border-r border-black p-1 text-center"></td>
              <td className="border-r border-black p-1 text-center">{reportData.identifier || '2'}</td>
              <td className="border-r border-black p-1 text-center">
                {subjectGrades.length > 0 
                  ? Math.round(subjectGrades.reduce((sum, s) => sum + (s.percentage_20 || 0), 0) / subjectGrades.length)
                  : ''}
              </td>
              <td className="border-r border-black p-1 text-center">
                {subjectGrades.length > 0 
                  ? Math.round(subjectGrades.reduce((sum, s) => sum + (s.percentage_80 || 0), 0) / subjectGrades.length)
                  : ''}
              </td>
              <td className="border-r border-black p-1 text-center">{reportData.overall_average ? Math.round(reportData.overall_average) : ''}</td>
              <td colSpan={4} className="p-1"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Overall Performance Summary */}
      <div className="border border-black border-t-0 p-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="font-bold">Overall Identifier</span>
          <span className="px-3 py-1 bg-gray-100 font-bold">{reportData.identifier || '2'}</span>
          <span className="font-bold">Overall Achievement</span>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 font-bold">{reportData.overall_achievement || getAchievementText(reportData.identifier || 2)}</span>
          <span className="font-bold">Overall grade</span>
          <span className="px-3 py-1 bg-blue-700 text-white font-bold text-lg">{reportData.overall_grade || 'B'}</span>
        </div>
      </div>

      {/* Grade Scale */}
      <div className="border border-black border-t-0 mb-2">
        <table className="w-full text-xs">
          <tbody>
            <tr className="text-center font-bold">
              <td className="border-r border-black p-1 bg-gray-50">GRADE</td>
              <td className="border-r border-black p-1 bg-green-50">A</td>
              <td className="border-r border-black p-1 bg-blue-50">B</td>
              <td className="border-r border-black p-1 bg-yellow-50">C</td>
              <td className="border-r border-black p-1 bg-orange-50">D</td>
              <td className="p-1 bg-red-50">E</td>
            </tr>
            <tr className="text-center">
              <td className="border-r border-black p-1 font-bold">SCORES</td>
              <td className="border-r border-black p-1">100 - 80</td>
              <td className="border-r border-black p-1">80 - 70</td>
              <td className="border-r border-black p-1">69 - 60</td>
              <td className="border-r border-black p-1">60 - 40</td>
              <td className="p-1">40 - 0</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Comments */}
      <div className="border border-black p-2 mb-2 text-xs">
        <div className="mb-2">
          <p className="font-bold italic mb-1">Class teacher's Comment:</p>
          <p className="italic">{reportData.class_teacher_comment || 'No comment provided'}</p>
        </div>
        <div>
          <p className="font-bold italic mb-1">Headteacher's Comment:</p>
          <p className="italic">{reportData.headteacher_comment || 'No comment provided'}</p>
        </div>
      </div>

      {/* Key to Terms */}
      <div className="border border-black p-2 mb-2 text-xs">
        <p className="font-bold mb-1">Key to Terms Used: <span className="font-normal"><span className="font-bold">A1</span> Average Chapter Assessment <span className="font-bold">80%</span> End of term assessment</span></p>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex gap-2">
            <span className="font-bold">1 - Basic</span>
            <span className="font-bold">0.9-1.49</span>
            <span>Few LOs achieved, but not sufficient for overall achievement</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold">2 - Moderate</span>
            <span className="font-bold">1.5-2.49</span>
            <span>Many LOs achieved, enough for overall achievement</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold">3 - Outstanding</span>
            <span className="font-bold">2.5-3.0</span>
            <span>Most or all LOs achieved for overall achievement</span>
          </div>
        </div>
      </div>

      {/* Footer Information */}
      <div className="border border-black text-xs">
        <div className="grid grid-cols-5 border-b border-black">
          <div className="border-r border-black p-2 text-center">
            <p className="font-bold mb-1">{reportData.term_ended_on ? format(new Date(reportData.term_ended_on), 'MM/dd/yyyy') : '04/25/2025'}</p>
            <p className="font-bold">TERM ENDED ON</p>
          </div>
          <div className="border-r border-black p-2 text-center">
            <p className="font-bold mb-1">{reportData.next_term_begins ? format(new Date(reportData.next_term_begins), 'MM/dd/yyyy') : '05/23/2025'}</p>
            <p className="font-bold">NEXT TERM BEGINS</p>
          </div>
          <div className="border-r border-black p-2 text-center">
            <p className="font-bold mb-1">{reportData.fees_balance ? `KES ${reportData.fees_balance.toLocaleString()}` : ''}</p>
            <p className="font-bold">FEES BALANCE</p>
          </div>
          <div className="border-r border-black p-2 text-center">
            <p className="font-bold mb-1">{reportData.fees_next_term ? `KES ${reportData.fees_next_term.toLocaleString()}` : ''}</p>
            <p className="font-bold">FEES NEXT TERM</p>
          </div>
          <div className="p-2 text-center">
            <p className="mb-1">{reportData.other_requirements || ''}</p>
            <p className="font-bold italic">Other Requirement</p>
          </div>
        </div>
        <div className="p-2 text-center italic font-semibold">
          Work hard to excel
        </div>
      </div>
    </div>
  );
}

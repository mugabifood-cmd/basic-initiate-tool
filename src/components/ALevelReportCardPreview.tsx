import { Fragment, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { getALevelGrade } from '@/lib/academicLevel';
import type { StampConfig } from '@/components/admin/StampConfigurator';

export type StampPosition = 'bottom-right' | 'center' | 'over-signatures';

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
  grade: string;
  remarks: string;
  teacher_initials: string;
}

interface ALevelReportCardPreviewProps {
  reportId: string;
  backgroundColor?: string;
  onReady?: () => void;
  showStamp?: boolean;
  stampPosition?: StampPosition;
  stampConfig?: StampConfig | null;
  stampInteractive?: boolean;
  onStampMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onStampTouchStart?: (e: React.TouchEvent<HTMLDivElement>) => void;
  isStampDragging?: boolean;
}

const thinBorder = '1px solid #8B7355';
const thickBorder = '1px solid #000000';
const cellStyle = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  border: thinBorder,
  padding: '4px 3px',
  textAlign: 'center',
  verticalAlign: 'middle',
  lineHeight: '1.3',
  fontSize: '9px',
  ...extra,
});

export default function ALevelReportCardPreview({
  reportId,
  backgroundColor = '#ffffff',
  onReady,
  showStamp = false,
  stampConfig,
  stampInteractive = false,
  onStampMouseDown,
  onStampTouchStart,
  isStampDragging = false,
}: ALevelReportCardPreviewProps) {
  const [reportData, setReportData] = useState<any>(null);
  const [subjectGrades, setSubjectGrades] = useState<SubjectGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [classTeacherSignature, setClassTeacherSignature] = useState<string | null>(null);
  const [headteacherSignature, setHeadteacherSignature] = useState<string | null>(null);
  const [schoolStampUrl, setSchoolStampUrl] = useState<string | null>(null);

  useEffect(() => {
   // Clear previous state before fetching new report
   setReportData(null);
   setSubjectGrades([]);
   setLoading(true);
   setClassTeacherSignature(null);
   setHeadteacherSignature(null);
   setSchoolStampUrl(null);
    fetchReportData();
  }, [reportId]);

  useEffect(() => {
    if (!loading && reportData && onReady) {
      const timer = setTimeout(() => onReady(), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, reportData, onReady]);

  const fetchReportData = async () => {
    try {
      const { data: report, error: reportError } = await supabase
        .from('report_cards')
        .select(`
          *,
          students (full_name, student_number, gender, house, photo_url, school_id, age),
          classes (name, stream, academic_year, term, school_id, term_ended_on, next_term_begins, general_requirements)
        `)
        .eq('id', reportId)
        .single();
      if (reportError) throw reportError;

      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('id', report.classes.school_id)
        .single();
      if (schoolError) throw schoolError;

      const { data: submissions, error: submissionsError } = await supabase
        .from('subject_submissions')
        .select(`*, subjects (name, code), profiles!subject_submissions_teacher_id_fkey (initials)`)
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
        grade: sub.grade || getALevelGrade(sub.percentage_100 || 0),
        remarks: sub.remarks || getRemarks(sub.percentage_100 || 0),
        teacher_initials: sub.profiles?.initials || 'N/A',
      }));

      setReportData({ ...report, school });
      setSubjectGrades(grades);
      setSchoolStampUrl((school as any).stamp_url || null);

      await fetchClassTeacherSignature(report.class_id);
      await fetchHeadteacherSignature();
    } catch (error: any) {
      console.error('Error fetching A-Level report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassTeacherSignature = async (classId: string) => {
    try {
      const { data: classData } = await supabase.from('classes').select('name, stream').eq('id', classId).single();
      if (!classData) return;
      const { data: assignment } = await supabase
        .from('teacher_assignments')
        .select('teacher_id')
        .eq('assignment_type', 'class_teacher')
        .eq('class_name', classData.name)
        .eq('stream', classData.stream)
        .maybeSingle();
      if (assignment?.teacher_id) {
        const { data: signature } = await supabase
          .from('signatures')
          .select('signature_data')
          .eq('profile_id', assignment.teacher_id)
          .eq('signature_type', 'class_teacher')
          .maybeSingle();
        if (signature?.signature_data) setClassTeacherSignature(signature.signature_data);
      }
    } catch (error) {
      console.error('Error fetching class teacher signature:', error);
    }
  };

  const fetchHeadteacherSignature = async () => {
    try {
      const { data: signature } = await supabase
        .from('signatures')
        .select('signature_data')
        .eq('signature_type', 'headteacher')
        .is('profile_id', null)
        .maybeSingle();
      if (signature?.signature_data) setHeadteacherSignature(signature.signature_data);
    } catch (error) {
      console.error('Error fetching headteacher signature:', error);
    }
  };

  const getRemarks = (pct: number): string => {
    if (pct >= 75) return 'Outstanding';
    if (pct >= 65) return 'Very Good';
    if (pct >= 50) return 'Satisfactory';
    if (pct >= 35) return 'Fair';
    return 'Needs Improvement';
  };

  const getStampStyle = (): React.CSSProperties => {
    if (stampConfig) {
      const cx = Math.max(5, Math.min(95, stampConfig.x));
      const cy = Math.max(5, Math.min(95, stampConfig.y));
      return { position: 'absolute', left: `${cx}%`, top: `${cy}%`, transform: 'translate(-50%, -50%)', opacity: stampConfig.opacity, zIndex: 10 };
    }
    return { position: 'absolute', bottom: '60px', right: '40px', opacity: 0.85, zIndex: 10 };
  };

  const stampSizePx = stampConfig?.size || 120;

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (!reportData) {
    return <div className="text-center py-8">Report card not found</div>;
  }

  // Calculate averages
  const avgPercentage20 = subjectGrades.length > 0
    ? subjectGrades.reduce((s, g) => s + (g.percentage_20 || 0), 0) / subjectGrades.length
    : 0;
  const avgPercentage80 = subjectGrades.length > 0
    ? subjectGrades.reduce((s, g) => s + (g.percentage_80 || 0), 0) / subjectGrades.length
    : 0;
  const avgPercentage100 = reportData.overall_average || 0;
  const overallGrade = reportData.overall_grade || getALevelGrade(avgPercentage100);
  const overallRemarks = getRemarks(avgPercentage100);
  const aggregateValue = avgPercentage100 ? Math.round(avgPercentage100) : 0;

  return (
    <div id="report-card-preview" className="report-card text-black p-4 mx-auto" style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', maxWidth: '210mm', width: '100%', backgroundColor, position: 'relative' }}>
      {/* Header */}
      <div style={{ border: thickBorder }} className="mb-1">
        <div className="flex items-start justify-between p-2">
          <div className="w-16 h-16 flex-shrink-0">
            {reportData.school?.logo_url ? (
              <img src={reportData.school.logo_url} alt="School Logo" className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs" style={{ border: thinBorder }}>Logo</div>
            )}
          </div>
          <div className="flex-1 text-center px-3">
            <h1 className="text-lg font-bold text-blue-700 uppercase mb-0">{reportData.school?.name || 'School Name'}</h1>
            <p style={{ fontSize: '8px' }}>P.O BOX {reportData.school?.po_box || ''}, {reportData.school?.location || ''}</p>
            <p style={{ fontSize: '8px' }}>EMAIL: {reportData.school?.email || ''}</p>
            <p style={{ fontSize: '8px' }}>CONTACTS: {reportData.school?.telephone || ''}</p>
          </div>
          <div className="w-20 h-24 flex-shrink-0">
            {reportData.students.photo_url ? (
              <img src={reportData.students.photo_url} alt="Student" className="w-full h-full object-cover" style={{ border: thinBorder }} />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs" style={{ border: thinBorder }}>Photo</div>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="text-center font-bold text-blue-700 py-1" style={{ fontSize: '13px', borderTop: thickBorder, borderBottom: thickBorder, backgroundColor: '#eef' }}>
          A LEVEL END OF TERM {reportData.classes.term?.toUpperCase()} REPORT CARD {reportData.classes.academic_year}
        </div>

        {/* Student info grid */}
        <div className="grid grid-cols-2 text-xs" style={{ fontSize: '9px' }}>
          <div className="flex gap-2 p-1" style={{ borderBottom: thinBorder, borderRight: thinBorder }}>
            <span className="font-bold">NAME:</span>
            <span className="text-blue-700 font-semibold">{reportData.students.full_name.toUpperCase()}</span>
          </div>
          <div className="flex gap-2 p-1" style={{ borderBottom: thinBorder }}>
            <span className="font-bold">GENDER:</span>
            <span className="text-blue-700 font-semibold">{reportData.students.gender?.toUpperCase()}</span>
          </div>
          <div className="flex gap-2 p-1" style={{ borderBottom: thinBorder, borderRight: thinBorder }}>
            <span className="font-bold">AGE:</span>
            <span>{reportData.students.age || 'N/A'}</span>
          </div>
          <div className="flex gap-2 p-1" style={{ borderBottom: thinBorder }}>
            <span className="font-bold">TERM:</span>
            <span className="text-blue-700 font-semibold">{reportData.classes.term?.toUpperCase()}</span>
          </div>
          <div className="flex gap-2 p-1" style={{ borderRight: thinBorder }}>
            <span className="font-bold">CLASS:</span>
            <span className="text-blue-700 font-semibold">{reportData.classes.name}</span>
          </div>
          <div className="flex gap-2 p-1">
            <span className="font-bold">Roll No:</span>
            <span>{reportData.students.student_number}</span>
          </div>
        </div>
        <div className="flex gap-2 p-1" style={{ borderTop: thinBorder }}>
          <span className="font-bold" style={{ fontSize: '9px' }}>Stream:</span>
          <span style={{ fontSize: '9px' }}>{reportData.classes.stream}</span>
          <span className="font-bold ml-4" style={{ fontSize: '9px' }}>Combination:</span>
          <span style={{ fontSize: '9px' }}>{reportData.classes.stream || 'N/A'}</span>
        </div>
      </div>

      {/* TERM PERFORMANCE RECORDS */}
      <div className="text-center bg-blue-700 text-white font-bold py-1 text-xs mb-0" style={{ border: thickBorder, borderBottom: 'none' }}>
        TERM PERFORMANCE RECORDS
      </div>

      {/* Subject Table */}
      <div style={{ border: thickBorder, borderTop: 'none' }}>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th rowSpan={2} style={cellStyle({ textAlign: 'left', fontWeight: 'bold' })}>Code Subject</th>
              <th rowSpan={2} style={cellStyle({ fontWeight: 'bold', width: '20px' })}>P<br/>A<br/>P<br/>E<br/>R</th>
              <th colSpan={5} style={cellStyle({ fontWeight: 'bold' })}>FORMATIVE</th>
              <th colSpan={3} style={cellStyle({ fontWeight: 'bold' })}>SUMMATIVE</th>
              <th rowSpan={2} style={cellStyle({ fontWeight: 'bold' })}>GRADE<br/>S</th>
              <th rowSpan={2} style={cellStyle({ fontWeight: 'bold', textAlign: 'left' })}>COMMENT</th>
              <th rowSpan={2} style={cellStyle({ fontWeight: 'bold' })}>TR</th>
            </tr>
            <tr>
              <th style={cellStyle({ fontWeight: 'bold' })}>A1</th>
              <th style={cellStyle({ fontWeight: 'bold' })}>A2</th>
              <th style={cellStyle({ fontWeight: 'bold' })}>A3</th>
              <th style={cellStyle({ fontWeight: 'bold' })}>AVG</th>
              <th style={cellStyle({ fontWeight: 'bold' })}>20%</th>
              <th style={cellStyle({ fontWeight: 'bold' })}>EOT</th>
              <th style={cellStyle({ fontWeight: 'bold' })}>80%</th>
              <th style={cellStyle({ fontWeight: 'bold' })}>100%</th>
            </tr>
          </thead>
          <tbody>
            {subjectGrades.map((subject, index) => (
              <Fragment key={`${subject.subject_code}-${index}`}>
                {/* Paper 1 row */}
                <tr>
                  <td rowSpan={2} style={cellStyle({ textAlign: 'left', fontWeight: 'bold' })}>
                    {subject.subject_code} &nbsp; {subject.subject_name.toUpperCase()}
                  </td>
                  <td style={cellStyle({ fontWeight: 'bold' })}>1</td>
                  <td style={cellStyle({ fontWeight: 'bold', color: '#8B0000' })}>{subject.a1_score?.toFixed(1) || ''}</td>
                  <td style={cellStyle({ fontWeight: 'bold', color: '#8B0000' })}>{subject.a2_score?.toFixed(1) || ''}</td>
                  <td style={cellStyle({ fontWeight: 'bold', color: '#8B0000' })}>{subject.a3_score?.toFixed(1) || ''}</td>
                  <td style={cellStyle({ fontWeight: 'bold' })}>{subject.average_score?.toFixed(1) || ''}</td>
                  <td style={cellStyle({ fontWeight: 'bold' })}>{subject.percentage_20 !== null ? subject.percentage_20.toFixed(1) : ''}</td>
                  <td style={cellStyle({ fontWeight: 'bold' })}></td>
                  <td style={cellStyle({ fontWeight: 'bold' })}>{subject.percentage_80 !== null ? Math.round(subject.percentage_80) : ''}</td>
                  <td style={cellStyle({ fontWeight: 'bold' })}>{subject.percentage_100 !== null ? subject.percentage_100.toFixed(1) : ''}</td>
                  <td rowSpan={2} style={cellStyle({ fontWeight: 'bold', color: '#0000aa' })}>{subject.grade}</td>
                  <td rowSpan={2} style={cellStyle({ fontStyle: 'italic', textAlign: 'left', color: '#8B0000' })}>{subject.remarks}</td>
                  <td rowSpan={2} style={cellStyle({ fontWeight: 'bold' })}>{subject.teacher_initials}</td>
                </tr>
                {/* Paper 2 row (empty) */}
                <tr>
                  <td style={cellStyle()}>2</td>
                  <td style={cellStyle()}></td>
                  <td style={cellStyle()}></td>
                  <td style={cellStyle()}></td>
                  <td style={cellStyle()}></td>
                  <td style={cellStyle()}></td>
                  <td style={cellStyle()}></td>
                  <td style={cellStyle()}></td>
                  <td style={cellStyle()}></td>
                </tr>
              </Fragment>
            ))}
            {/* Average row */}
            <tr style={{ backgroundColor: '#e8d8ff' }}>
              <td colSpan={2} style={cellStyle({ fontWeight: 'bold', textAlign: 'left' })}>AVERAGE SCORES</td>
              <td style={cellStyle()}></td>
              <td style={cellStyle()}></td>
              <td style={cellStyle()}></td>
              <td style={cellStyle()}></td>
              <td style={cellStyle({ fontWeight: 'bold' })}>{avgPercentage20 ? avgPercentage20.toFixed(2) : ''}</td>
              <td style={cellStyle()}></td>
              <td style={cellStyle({ fontWeight: 'bold' })}>{avgPercentage80 ? avgPercentage80.toFixed(2) : ''}</td>
              <td style={cellStyle({ fontWeight: 'bold' })}>{avgPercentage100 ? avgPercentage100.toFixed(2) : ''}</td>
              <td style={cellStyle({ fontWeight: 'bold', color: '#0000aa' })}>{overallGrade}</td>
              <td style={cellStyle({ fontWeight: 'bold', fontStyle: 'italic', textAlign: 'left', color: '#8B0000' })}>{overallRemarks}</td>
              <td style={cellStyle()}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Overall Summary Row */}
      <div style={{ border: thickBorder, borderTop: 'none' }} className="grid grid-cols-3 text-xs">
        <div className="p-2 text-center" style={{ borderRight: thinBorder }}>
          <p className="font-bold">AGGREGATES</p>
          <p className="font-bold text-blue-700">{aggregateValue || '-'}</p>
        </div>
        <div className="p-2 text-center" style={{ borderRight: thinBorder }}>
          <p className="font-bold">OVERALL ACHIEVEMENT</p>
          <p className="font-bold text-blue-700">{reportData.overall_achievement || overallRemarks}</p>
        </div>
        <div className="p-2 text-center">
          <p className="font-bold">OVERALL GRADE</p>
          <p className="font-bold text-blue-700">{overallGrade}</p>
        </div>
      </div>

      {/* Grade Scale */}
      <div style={{ border: thickBorder, borderTop: 'none' }} className="mb-1">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr className="text-center font-bold">
              <td style={cellStyle({ backgroundColor: '#f3f4f6' })}>GRADE</td>
              <td style={cellStyle({ backgroundColor: '#dcfce7' })}>A</td>
              <td style={cellStyle({ backgroundColor: '#dbeafe' })}>B</td>
              <td style={cellStyle({ backgroundColor: '#fef9c3' })}>C</td>
              <td style={cellStyle({ backgroundColor: '#fed7aa' })}>D</td>
              <td style={cellStyle({ backgroundColor: '#fecaca' })}>E</td>
            </tr>
            <tr className="text-center">
              <td style={cellStyle({ fontWeight: 'bold' })}>SCORES</td>
              <td style={cellStyle()}>75-100</td>
              <td style={cellStyle()}>65-74</td>
              <td style={cellStyle()}>50-64</td>
              <td style={cellStyle()}>35-49</td>
              <td style={cellStyle()}>0-34</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Key to Terms Used */}
      <div style={{ border: thickBorder }} className="p-1 mb-1 text-xs" >
        <p className="font-bold mb-0" style={{ fontSize: '8px' }}>
          Key to Terms Used: &nbsp;
          <span className="font-bold">A1</span> End of Chapter Assessment &nbsp;
          <span className="font-bold">80%</span> End of term assessment
        </p>
        <div style={{ fontSize: '8px' }}>
          <p><span className="font-bold">1 - Basic</span> <span className="font-bold">0.9-1.49</span> Few LOs achieved, but not sufficient for overall achievement</p>
          <p><span className="font-bold">2 - Moderate</span> <span className="font-bold">1.5-2.49</span> Many LOs achieved, enough for overall achievement</p>
          <p><span className="font-bold">3 - Outstanding</span> <span className="font-bold">2.5-3.0</span> Most or all LOs achieved for overall achievement</p>
        </div>
      </div>

      {/* Student's Projects Work */}
      <div className="text-center font-bold py-1 text-xs mb-0" style={{ border: thickBorder, borderBottom: 'none' }}>
        STUDENT'S PROJECTS WORK
      </div>
      <div style={{ border: thickBorder, borderTop: 'none' }} className="mb-1">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="font-bold text-center" style={{ fontSize: '8px' }}>
              <td style={cellStyle({ fontWeight: 'bold' })}>TERMLY<br/>PROJECT WORK</td>
              <td style={cellStyle({ fontWeight: 'bold' })}>AVERAGE<br/>SCORE(10)</td>
              <td style={cellStyle({ fontWeight: 'bold' })}>OUT<br/>OF 100</td>
              <td style={cellStyle({ fontWeight: 'bold' })}>GRADE</td>
              <td style={cellStyle({ fontWeight: 'bold' })}>REMARKS</td>
              <td style={cellStyle({ fontWeight: 'bold' })}>TEACHER</td>
            </tr>
          </thead>
          <tbody>
            <tr className="text-center">
              <td style={cellStyle({ fontStyle: 'italic' })}>&nbsp;</td>
              <td style={cellStyle()}>&nbsp;</td>
              <td style={cellStyle()}>&nbsp;</td>
              <td style={cellStyle()}>&nbsp;</td>
              <td style={cellStyle()}>&nbsp;</td>
              <td style={cellStyle()}>&nbsp;</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Comments */}
      <div style={{ border: thickBorder }} className="p-2 mb-1 text-xs">
        <div className="mb-2 flex justify-between">
          <div className="flex-1">
            <p className="font-bold italic" style={{ fontSize: '9px' }}>Class teacher's Comment:</p>
            <p className="italic" style={{ fontSize: '9px' }}>{reportData.class_teacher_comment || 'No comment provided'}</p>
          </div>
          <div className="text-right min-w-[120px]">
            <p className="font-bold italic" style={{ fontSize: '9px' }}>Class Teacher's Signature:</p>
            {classTeacherSignature ? (
              <div className="mt-1 flex justify-end">
                <img src={classTeacherSignature} alt="Class Teacher Signature" className="max-h-8 object-contain" style={{ maxWidth: '100px' }} />
              </div>
            ) : (
              <p className="mt-1 text-gray-400 italic" style={{ fontSize: '8px' }}>No signature</p>
            )}
          </div>
        </div>
        <div className="flex justify-between">
          <div className="flex-1">
            <p className="font-bold italic" style={{ fontSize: '9px' }}>Headteacher's Comment:</p>
            <p className="italic" style={{ fontSize: '9px' }}>{reportData.headteacher_comment || 'No comment provided'}</p>
          </div>
          <div className="text-right min-w-[120px]">
            <p className="font-bold italic" style={{ fontSize: '9px' }}>Headteacher's Signature:</p>
            {headteacherSignature ? (
              <div className="mt-1 flex justify-end">
                <img src={headteacherSignature} alt="Headteacher Signature" className="max-h-8 object-contain" style={{ maxWidth: '100px' }} />
              </div>
            ) : (
              <p className="mt-1 text-gray-400 italic" style={{ fontSize: '8px' }}>No signature</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer - Term dates and fees */}
      <div style={{ border: thickBorder }} className="text-xs">
        <div className="grid grid-cols-4" style={{ borderBottom: thickBorder }}>
          <div style={{ borderRight: thinBorder }} className="p-2 text-center">
            <p className="font-bold">{reportData.classes.term_ended_on ? format(new Date(reportData.classes.term_ended_on), 'dd-MMM-yyyy') : ''}</p>
            <p className="font-bold" style={{ fontSize: '8px' }}>TERM ENDED ON</p>
          </div>
          <div style={{ borderRight: thinBorder }} className="p-2 text-center">
            <p className="font-bold">{reportData.classes.next_term_begins ? format(new Date(reportData.classes.next_term_begins), 'dd-MMM-yyyy') : ''}</p>
            <p className="font-bold" style={{ fontSize: '8px' }}>NEXT TERM BEGINS</p>
          </div>
          <div style={{ borderRight: thinBorder }} className="p-2 text-center">
            <p className="font-bold">Ugx {reportData.fees_balance ? reportData.fees_balance.toLocaleString() : '0'}/=</p>
            <p className="font-bold" style={{ fontSize: '8px' }}>FEES BALANCE</p>
          </div>
          <div className="p-2 text-center">
            <p className="font-bold">Ugx {reportData.fees_next_term ? reportData.fees_next_term.toLocaleString() : '0'}/=</p>
            <p className="font-bold" style={{ fontSize: '8px' }}>FEES NEXT TERM</p>
          </div>
        </div>
        <div className="p-2 text-center italic font-bold" style={{ fontSize: '10px' }}>
          {reportData.school?.motto ? reportData.school.motto.toUpperCase() : 'EXCELLENCE IN EDUCATION'}
        </div>
      </div>

      {/* School Stamp */}
      {showStamp && schoolStampUrl && (
        <div
          onMouseDown={stampInteractive ? onStampMouseDown : undefined}
          onTouchStart={stampInteractive ? onStampTouchStart : undefined}
          style={{
            ...getStampStyle(),
            pointerEvents: stampInteractive ? 'auto' : 'none',
            cursor: stampInteractive ? (isStampDragging ? 'grabbing' : 'grab') : 'default',
            touchAction: stampInteractive ? 'none' : undefined,
            userSelect: 'none',
          }}
        >
          <img src={schoolStampUrl} alt="School Stamp" draggable={false} style={{ width: `${stampSizePx}px`, height: `${stampSizePx}px`, objectFit: 'contain', pointerEvents: 'none' }} />
          {stampInteractive && (
            <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: '8px', fontWeight: 'bold' }}>⠿</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

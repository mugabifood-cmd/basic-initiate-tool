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
  autoPrint?: boolean;
  onPrintComplete?: () => void;
}

// Ultra-thin border style constant for nearly invisible borders
const thinBorder = '0.1px solid #ddd';
export default function ReportCardPreview({
  reportId,
  autoPrint = false,
  onPrintComplete
}: ReportCardPreviewProps) {
  const [reportData, setReportData] = useState<any>(null);
  const [subjectGrades, setSubjectGrades] = useState<SubjectGrade[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchReportData();
  }, [reportId]);
  useEffect(() => {
    // Auto-print logic: trigger print when content is ready
    if (autoPrint && !loading && reportData && subjectGrades.length > 0) {
      const printTimeout = setTimeout(() => {
        window.print();
        // Call onPrintComplete after a short delay to ensure print dialog has appeared
        setTimeout(() => {
          onPrintComplete?.();
        }, 500);
      }, 300);
      return () => clearTimeout(printTimeout);
    }
  }, [autoPrint, loading, reportData, subjectGrades, onPrintComplete]);
  const fetchReportData = async () => {
    try {
      // Fetch report card with all relations
      const {
        data: report,
        error: reportError
      } = await supabase.from('report_cards').select(`
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
            school_id,
            term_ended_on,
            next_term_begins,
            general_requirements
          )
        `).eq('id', reportId).single();
      if (reportError) throw reportError;

      // Fetch school information
      const {
        data: school,
        error: schoolError
      } = await supabase.from('schools').select('*').eq('id', report.classes.school_id).single();
      if (schoolError) throw schoolError;

      // Fetch subject submissions with teacher info
      const {
        data: submissions,
        error: submissionsError
      } = await supabase.from('subject_submissions').select(`
          *,
          subjects (
            name,
            code
          ),
          profiles!subject_submissions_teacher_id_fkey (
            initials
          )
        `).eq('student_id', report.student_id).eq('class_id', report.class_id).eq('status', 'approved');
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
      setReportData({
        ...report,
        school
      });
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
      case 3:
        return 'Outstanding';
      case 2:
        return 'Moderate';
      case 1:
        return 'Basic';
      default:
        return 'Below Basic';
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  if (!reportData) {
    return <div className="text-center py-8">Report card not found</div>;
  }
  return <div id="report-card-preview" className="bg-white text-black p-6 mx-auto" style={{
    fontFamily: 'Arial, sans-serif',
    fontSize: '10px',
    maxWidth: '210mm',
    width: '100%'
  }}>
      {/* Header with Logo and Student Photo */}
      <div style={{
      border: thinBorder
    }} className="mb-2">
        <div className="flex items-start justify-between p-3">
          {/* School Logo - Left */}
          <div className="w-20 h-20 flex-shrink-0">
            {reportData.school?.logo_url ? <img src={reportData.school.logo_url} alt="School Logo" className="w-full h-full object-contain" style={{
            border: thinBorder
          }} /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs" style={{
            border: thinBorder
          }}>
                Logo
              </div>}
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
            {reportData.students.photo_url ? <img src={reportData.students.photo_url} alt="Student" className="w-full h-full object-cover" style={{
            border: thinBorder
          }} /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs" style={{
            border: thinBorder
          }}>
                Photo
              </div>}
          </div>
        </div>

        {/* Student Information */}
        <div style={{
        borderTop: thinBorder
      }} className="p-2 grid grid-cols-3 gap-x-8 text-xs">
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
      <div style={{
      border: thinBorder
    }}>
        <table className="w-full text-xs report-table" style={{
        borderCollapse: 'collapse',
        borderSpacing: 0
      }}>
          <thead>
            <tr className="bg-gray-50">
              <th style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'left',
              fontWeight: 'bold',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>Code</th>
              <th style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'left',
              fontWeight: 'bold',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>Subject</th>
              <th style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              fontWeight: 'bold',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>A1</th>
              <th style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              fontWeight: 'bold',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>A2</th>
              <th style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              fontWeight: 'bold',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>A3</th>
              <th style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              fontWeight: 'bold',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>AVG</th>
              <th style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              fontWeight: 'bold',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>20%</th>
              <th style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              fontWeight: 'bold',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>80%</th>
              <th style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              fontWeight: 'bold',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>100%</th>
              <th style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              fontWeight: 'bold',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>Ident</th>
              <th style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              fontWeight: 'bold',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>GRADE</th>
              <th style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'left',
              fontWeight: 'bold',
              fontStyle: 'italic',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>Remarks/Descriptors</th>
              <th style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              fontWeight: 'bold',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>TR</th>
            </tr>
          </thead>
          <tbody>
            {subjectGrades.map((subject, index) => <tr key={index}>
                <td style={{
              border: thinBorder,
              padding: '6px 4px',
              fontWeight: 'bold',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>{subject.subject_code}</td>
                <td style={{
              border: thinBorder,
              padding: '6px 4px',
              fontWeight: 'bold',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>{subject.subject_name}</td>
                <td style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>{subject.a1_score?.toFixed(1) || ''}</td>
                <td style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>{subject.a2_score?.toFixed(1) || ''}</td>
                <td style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>{subject.a3_score?.toFixed(1) || ''}</td>
                <td style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>{subject.average_score?.toFixed(1) || ''}</td>
                <td style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>{subject.percentage_20 !== null ? Math.round(subject.percentage_20) : ''}</td>
                <td style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>{subject.percentage_80 !== null ? Math.round(subject.percentage_80) : ''}</td>
                <td style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>{Math.round(subject.percentage_100)}</td>
                <td style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>{subject.identifier || ''}</td>
                <td style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              fontWeight: 'bold',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>{subject.grade || ''}</td>
                <td style={{
              border: thinBorder,
              padding: '6px 4px',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>{subject.remarks || ''}</td>
                <td style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              fontWeight: 'bold',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>{subject.teacher_initials}</td>
              </tr>)}
            {/* Average Row */}
            <tr className="font-bold bg-gray-50">
              <td colSpan={2} style={{
              border: thinBorder,
              padding: '6px 4px',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>AVERAGE:</td>
              <td style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}></td>
              <td style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}></td>
              <td style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}></td>
              <td style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>{reportData.identifier || '2'}</td>
              <td style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>
                {subjectGrades.length > 0 ? Math.round(subjectGrades.reduce((sum, s) => sum + (s.percentage_20 || 0), 0) / subjectGrades.length) : ''}
              </td>
              <td style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>
                {subjectGrades.length > 0 ? Math.round(subjectGrades.reduce((sum, s) => sum + (s.percentage_80 || 0), 0) / subjectGrades.length) : ''}
              </td>
              <td style={{
              border: thinBorder,
              padding: '6px 4px',
              textAlign: 'center',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}>{reportData.overall_average ? Math.round(reportData.overall_average) : ''}</td>
              <td colSpan={4} style={{
              border: thinBorder,
              padding: '6px 4px',
              verticalAlign: 'middle',
              lineHeight: '1.4'
            }}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Overall Performance Summary */}
      <div style={{
      border: thinBorder,
      borderTop: 'none'
    }} className="p-2 flex items-center justify-between text-xs">
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
      <div style={{
      border: thinBorder,
      borderTop: 'none'
    }} className="mb-2">
        <table className="w-full text-xs report-table" style={{
        borderCollapse: 'collapse',
        borderSpacing: 0
      }}>
          <tbody>
            <tr className="text-center font-bold">
              <td style={{
              border: thinBorder,
              padding: '4px',
              verticalAlign: 'middle'
            }} className="bg-gray-50">GRADE</td>
              <td style={{
              border: thinBorder,
              padding: '4px',
              verticalAlign: 'middle'
            }} className="bg-green-50">A</td>
              <td style={{
              border: thinBorder,
              padding: '4px',
              verticalAlign: 'middle'
            }} className="bg-blue-50">B</td>
              <td style={{
              border: thinBorder,
              padding: '4px',
              verticalAlign: 'middle'
            }} className="bg-yellow-50">C</td>
              <td style={{
              border: thinBorder,
              padding: '4px',
              verticalAlign: 'middle'
            }} className="bg-orange-50">D</td>
              <td style={{
              border: thinBorder,
              padding: '4px',
              verticalAlign: 'middle'
            }} className="bg-red-50">E</td>
            </tr>
            <tr className="text-center">
              <td style={{
              border: thinBorder,
              padding: '4px',
              fontWeight: 'bold',
              verticalAlign: 'middle'
            }}>SCORES</td>
              <td style={{
              border: thinBorder,
              padding: '4px',
              verticalAlign: 'middle'
            }}>100 - 80</td>
              <td style={{
              border: thinBorder,
              padding: '4px',
              verticalAlign: 'middle'
            }}>80 - 70</td>
              <td style={{
              border: thinBorder,
              padding: '4px',
              verticalAlign: 'middle'
            }}>69 - 60</td>
              <td style={{
              border: thinBorder,
              padding: '4px',
              verticalAlign: 'middle'
            }}>60 - 40</td>
              <td style={{
              border: thinBorder,
              padding: '4px',
              verticalAlign: 'middle'
            }}>40 - 0</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Comments */}
      <div style={{
      border: thinBorder
    }} className="p-2 mb-2 text-xs">
        <div className="mb-2">
          <div className="flex justify-between items-start mb-1">
            <p className="font-bold italic">Class teacher's Comment:</p>
            <p className="font-bold italic">Class Teacher's Signature: ___________________</p>
          </div>
          <p className="italic">{reportData.class_teacher_comment || 'No comment provided'}</p>
        </div>
        <div>
          <div className="flex justify-between items-start mb-1">
            <p className="font-bold italic">Headteacher's Comment:</p>
            <p className="font-bold italic">Headteacher's Signature:
 ___________________</p>
          </div>
          <p className="italic">{reportData.headteacher_comment || 'No comment provided'}</p>
        </div>
      </div>

      {/* Key to Terms */}
      <div style={{
      border: thinBorder
    }} className="p-2 mb-2 text-xs">
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
      <div style={{
      border: thinBorder
    }} className="text-xs">
        <div className="grid grid-cols-5" style={{
        borderBottom: thinBorder
      }}>
          <div style={{
          borderRight: thinBorder
        }} className="p-2 text-center">
            <p className="font-bold mb-1">TERM ENDED ON</p>
            <p className="font-bold">{reportData.classes.term_ended_on ? format(new Date(reportData.classes.term_ended_on), 'MM/dd/yyyy') : '04/25/2025'}</p>
          </div>
          <div style={{
          borderRight: thinBorder
        }} className="p-2 text-center">
            <p className="font-bold mb-1">NEXT TERM BEGINS</p>
            <p className="font-bold">{reportData.classes.next_term_begins ? format(new Date(reportData.classes.next_term_begins), 'MM/dd/yyyy') : '05/23/2025'}</p>
          </div>
          <div style={{
          borderRight: thinBorder
        }} className="p-2 text-center">
            <p className="font-bold mb-1">FEES BALANCE</p>
            <p className="font-bold">{reportData.fees_balance ? reportData.fees_balance.toLocaleString() : ''}</p>
          </div>
          <div style={{
          borderRight: thinBorder
        }} className="p-2 text-center">
            <p className="font-bold mb-1">FEES NEXT TERM</p>
            <p className="font-bold">{reportData.fees_next_term ? reportData.fees_next_term.toLocaleString() : ''}</p>
          </div>
          <div className="p-2 text-center">
            <p className="font-bold italic mb-1">Other Requirement</p>
            <p>{reportData.classes.general_requirements || ''}</p>
          </div>
        </div>
        <div className="p-2 text-center italic font-semibold">
          Work hard to excel
        </div>
      </div>
    </div>;
}
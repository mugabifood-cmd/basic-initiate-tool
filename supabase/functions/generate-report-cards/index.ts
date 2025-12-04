import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { class_id, student_ids, template_id, generation_type } = await req.json();

    console.log('Starting report card generation:', {
      class_id,
      student_ids,
      template_id,
      generation_type
    });

    if (!class_id || !student_ids || student_ids.length === 0) {
      throw new Error('Missing required fields: class_id and student_ids are required');
    }

    // Get auth user from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get the profile to get the generated_by ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    // Fetch class information including term dates and requirements
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select(`
        id,
        name,
        stream,
        academic_year,
        term,
        school_id,
        term_ended_on,
        next_term_begins,
        general_requirements,
        schools (
          id,
          name,
          logo_url,
          motto,
          location,
          po_box,
          telephone,
          email,
          website
        )
      `)
      .eq('id', class_id)
      .single();

    if (classError || !classData) {
      throw new Error('Class not found');
    }

    const results = [];

    // Process each student
    for (const student_id of student_ids) {
      try {
        // Fetch student information
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('id', student_id)
          .single();

        if (studentError || !studentData) {
          console.error(`Student ${student_id} not found:`, studentError);
          results.push({
            student_id,
            success: false,
            error: 'Student not found'
          });
          continue;
        }

        // Fetch subject submissions for this student and class
        const { data: submissions, error: submissionsError } = await supabase
          .from('subject_submissions')
          .select(`
            *,
            subjects (
              id,
              name,
              code
            ),
            profiles!subject_submissions_teacher_id_fkey (
              id,
              full_name,
              initials
            )
          `)
          .eq('student_id', student_id)
          .eq('class_id', class_id)
          .eq('status', 'approved');

        if (submissionsError) {
          console.error(`Error fetching submissions for student ${student_id}:`, submissionsError);
        }

        const subjectScores = submissions || [];

        // Calculate overall statistics
        let totalScore = 0;
        let subjectCount = 0;
        
        for (const submission of subjectScores) {
          if (submission.percentage_100) {
            totalScore += parseFloat(submission.percentage_100);
            subjectCount++;
          }
        }

        const overallAverage = subjectCount > 0 ? totalScore / subjectCount : 0;
        const overallGrade = calculateGrade(overallAverage);

        // Fetch all comment templates and find matching one based on average
        const { data: commentTemplates, error: templateError } = await supabase
          .from('comment_templates')
          .select('*');

        if (templateError) {
          console.error('Error fetching comment templates:', templateError);
        }

        // Find the matching template where average falls within min/max range
        const commentTemplate = commentTemplates?.find(t => 
          overallAverage >= t.min_percentage && overallAverage <= t.max_percentage
        );

        console.log('Overall average:', overallAverage, 'Found comment template:', commentTemplate?.id, 
          'Class comment:', commentTemplate?.class_teacher_comment?.substring(0, 30) || 'none');

        // Check if report card already exists
        const { data: existingReport, error: existingError } = await supabase
          .from('report_cards')
          .select('id')
          .eq('student_id', student_id)
          .eq('class_id', class_id)
          .maybeSingle();

        let reportCardId;

        if (existingReport) {
          // Update existing report card
          // NOTE: Financial fields (fees_balance, fees_next_term, other_requirements) are NOT updated
          // here to preserve admin-only data. These fields can only be modified via the admin interface.
          const { data: updatedReport, error: updateError } = await supabase
            .from('report_cards')
            .update({
              overall_average: overallAverage,
              overall_grade: overallGrade,
              class_teacher_comment: commentTemplate?.class_teacher_comment || null,
              headteacher_comment: commentTemplate?.headteacher_comment || null,
              template_id: template_id || 1,
              generated_at: new Date().toISOString(),
              generated_by: profile.id,
              status: 'generated',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingReport.id)
            .select()
            .single();

          if (updateError) {
            throw updateError;
          }
          reportCardId = updatedReport.id;
        } else {
          // Create new report card
          // NOTE: Financial fields (fees_balance, fees_next_term, other_requirements) are initialized
          // as null and can only be set by admin users via the admin interface.
          const { data: newReport, error: insertError } = await supabase
            .from('report_cards')
            .insert({
              student_id,
              class_id,
              overall_average: overallAverage,
              overall_grade: overallGrade,
              class_teacher_comment: commentTemplate?.class_teacher_comment || null,
              headteacher_comment: commentTemplate?.headteacher_comment || null,
              template_id: template_id || 1,
              generated_at: new Date().toISOString(),
              generated_by: profile.id,
              status: 'generated'
            })
            .select()
            .single();

          if (insertError) {
            throw insertError;
          }
          reportCardId = newReport.id;
        }

        results.push({
          student_id,
          student_name: studentData.full_name,
          report_card_id: reportCardId,
          success: true,
          overall_average: overallAverage,
          overall_grade: overallGrade
        });

        console.log(`Successfully generated report card for ${studentData.full_name}`);
      } catch (error: any) {
        console.error(`Error processing student ${student_id}:`, error);
        results.push({
          student_id,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${successCount} report card(s). ${failureCount > 0 ? `${failureCount} failed.` : ''}`,
        results,
        class_info: {
          name: classData.name,
          stream: classData.stream,
          academic_year: classData.academic_year,
          term: classData.term
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error in generate-report-cards function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});

// Helper function to calculate grade based on percentage
function calculateGrade(percentage: number): string {
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

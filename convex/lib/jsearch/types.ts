/** Raw job shape returned by OpenWebNinja JSearch (`/search-v2`, `/job-details`). */
export interface JSearchJob {
  job_id: string;
  employer_name?: string;
  employer_logo?: string;
  job_title?: string;
  job_description?: string;
  job_apply_link?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_location?: string;
  job_is_remote?: boolean | null;
  work_arrangement?: string | null;
  job_posted_at?: string;
  job_posted_at_timestamp?: number;
  job_posted_at_datetime_utc?: string;
  job_employment_type?: string;
  job_employment_types?: string[];
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_period?: string;
  job_salary_currency?: string;
  seniority_level?: string;
  required_experience_years?: number;
  required_technologies?: string[];
  job_highlights?: {
    Qualifications?: string[];
    Responsibilities?: string[];
    Benefits?: string[];
  };
  job_required_skills?: string[];
  job_required_experience?: Record<string, unknown>;
}

/** Envelope returned by the `/search-v2` endpoint. */
export interface JSearchSearchResponse {
  status?: string;
  request_id?: string;
  data?: {
    jobs?: JSearchJob[];
    cursor?: string | null;
  };
}

export interface TransformedJob {
  job_id: string;
  employer_name: string;
  employer_logo?: string;
  job_title: string;
  job_description: string;
  job_description_clean: string;
  job_apply_link: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_is_remote: boolean;
  job_posted_at_datetime_utc?: string;
  job_employment_type?: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
  job_highlights?: JSearchJob["job_highlights"];
  job_required_skills?: string[];
  job_required_experience?: Record<string, unknown>;
  extracted_requirements?: string[];
  posted_days_ago?: number;
  location_display?: string;
  match_score?: number;
  match_label?: string;
  match_reasons?: string[];
  missing_skills?: string[];
  key_strengths?: string[];
}

export interface JobSearchFilters {
  datePosted?: string;
  remote?: boolean;
  employmentTypes?: string[];
  experienceLevel?: string[];
  radius?: number;
}

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const CATEGORY_LABELS = {
  wrong_answer: 'Wrong answer',
  unclear: 'Question unclear',
  translation: 'Translation error',
  other: 'Other',
};

export default function AdminFlagDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [editFields, setEditFields] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get(`/admin/flags/${id}`).then(({ data: d }) => {
      setData(d);
      setAdminNote(d.flag.admin_note || '');
      const q = d.question;
      setEditFields({
        question_en: q.question_en,
        question_hi: q.question_hi,
        options_en: q.options_en,
        options_hi: q.options_hi,
        correct_option: q.correct_option,
        explanation_en: q.explanation_en,
        explanation_hi: q.explanation_hi,
      });
    }).catch(() => {});
  };

  useEffect(() => { load(); }, [id]);

  const handleStatus = async (status) => {
    setMsg(''); setError('');
    try {
      await api.patch(`/admin/flags/${id}/status`, { status, adminNote });
      load();
      setMsg(`Flag ${status}`);
    } catch (err) {
      setError(err.response?.data?.error || t('error'));
    }
  };

  const handleSaveQuestion = async () => {
    setSaving(true); setMsg(''); setError('');
    try {
      await api.patch(`/admin/flags/${id}/question`, editFields);
      setMsg('Question updated successfully');
      load();
    } catch (err) {
      setError(err.response?.data?.error || t('error'));
    }
    setSaving(false);
  };

  const handleResolve = async () => {
    const count = data.approvedCount;
    if (!window.confirm(`This will award 1000 points to ${count} user(s) who flagged this question. Confirm?`)) return;
    setMsg(''); setError('');
    try {
      await api.post(`/admin/flags/${id}/resolve`, { adminNote });
      setMsg(`Resolved! ${count} user(s) awarded 1000 pts each.`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || t('error'));
    }
  };

  if (!data) return <div className="p-6 text-center text-gray-400">{t('loading')}</div>;

  const { flag, question, approvedCount } = data;
  const options = JSON.parse(question.options_en);
  const optionsHi = question.options_hi ? JSON.parse(question.options_hi) : null;

  return (
    <div className="px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/admin/flags" className="text-indigo-600 text-sm">← Flags</Link>
        <h2 className="text-xl font-bold text-gray-800">Flag #{flag.id}</h2>
      </div>

      {msg && <p className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-2 text-sm">{msg}</p>}
      {error && <p className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2 text-sm">{error}</p>}

      {/* Flag info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-800">{flag.reporter_name}</p>
          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
            {CATEGORY_LABELS[flag.category] || flag.category}
          </span>
        </div>
        <p className="text-xs text-gray-400">{new Date(flag.created_at).toLocaleDateString('en-IN')}</p>
        {flag.note && <p className="text-sm text-gray-600 italic">"{flag.note}"</p>}
        {flag.admin_note && (
          <p className="text-xs text-gray-500"><span className="font-medium">{t('adminNote')}:</span> {flag.admin_note}</p>
        )}
        {flag.resolved_at && (
          <p className="text-xs text-gray-400">Resolved: {new Date(flag.resolved_at).toLocaleDateString('en-IN')}</p>
        )}
      </div>

      {/* Current question display */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Question</p>
        <p className="text-sm font-medium text-gray-800">{question.question_en}</p>
        {question.question_hi && <p className="text-sm text-gray-500">{question.question_hi}</p>}
        <div className="space-y-1.5">
          {options.map((opt, idx) => (
            <div
              key={idx}
              className={`rounded-lg border px-3 py-2 text-xs flex items-center gap-2 ${idx === question.correct_option ? 'border-green-300 bg-green-50 text-green-800 font-semibold' : 'border-gray-100 bg-gray-50 text-gray-600'}`}
            >
              <span className="w-4 flex-shrink-0">{OPTION_LABELS[idx]}.</span>
              <span className="flex-1">{opt}</span>
              {optionsHi && <span className="text-gray-400 text-xs">{optionsHi[idx]}</span>}
              {idx === question.correct_option && <span>✓</span>}
            </div>
          ))}
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600">
          <span className="font-medium">Explanation:</span> {question.explanation_en}
        </div>
      </div>

      {/* Action panel — pending */}
      {flag.status === 'pending' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Admin Note (optional)</p>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            rows={2}
            placeholder="Leave a note for the reporter..."
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleStatus('dismissed')}
              className="flex-1 border border-red-200 text-red-600 rounded-xl py-2.5 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              {t('dismissFlag')}
            </button>
            <button
              onClick={() => handleStatus('approved')}
              className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              {t('approveFlag')}
            </button>
          </div>
        </div>
      )}

      {/* Action panel — approved: edit + resolve */}
      {flag.status === 'approved' && editFields && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Edit Question</p>

          {[
            { label: 'Question (EN)', field: 'question_en', rows: 2 },
            { label: 'Question (HI)', field: 'question_hi', rows: 2 },
            { label: 'Explanation (EN)', field: 'explanation_en', rows: 2 },
            { label: 'Explanation (HI)', field: 'explanation_hi', rows: 2 },
          ].map(({ label, field, rows }) => (
            <div key={field}>
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                rows={rows}
                value={editFields[field] || ''}
                onChange={(e) => setEditFields(f => ({ ...f, [field]: e.target.value }))}
              />
            </div>
          ))}

          <div>
            <p className="text-xs text-gray-500 mb-1">Options (EN) — JSON array e.g. ["A","B","C","D"]</p>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={editFields.options_en || ''}
              onChange={(e) => setEditFields(f => ({ ...f, options_en: e.target.value }))}
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Options (HI) — JSON array</p>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={editFields.options_hi || ''}
              onChange={(e) => setEditFields(f => ({ ...f, options_hi: e.target.value }))}
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Correct Option Index (0–3)</p>
            <input
              type="number" min={0} max={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={editFields.correct_option}
              onChange={(e) => setEditFields(f => ({ ...f, correct_option: Number(e.target.value) }))}
            />
          </div>

          <button
            onClick={handleSaveQuestion}
            disabled={saving}
            className="w-full bg-gray-800 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50"
          >
            {saving ? t('loading') : t('saveQuestionChanges')}
          </button>

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500 mb-2">Admin Note (optional)</p>
            <textarea
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              rows={2}
              placeholder="Note for reporters..."
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
            <button
              onClick={handleResolve}
              className="w-full mt-2 bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              {t('resolveAndAward')} ({approvedCount} user{approvedCount !== 1 ? 's' : ''})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

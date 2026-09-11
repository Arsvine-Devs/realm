import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { SkillCategory } from '@/shared/types';
import s from './SkillTree.module.scss';

interface SkillTreeProps {
  categories: SkillCategory[];
  expanded?: boolean;
}

export default function SkillTree({ categories, expanded }: SkillTreeProps) {
  const t = useTranslations('sections.works');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tappedId, setTappedId] = useState<string | null>(null);
  const [typedText, setTypedText] = useState('');
  const prevDescRef = useRef('');
  const [wasExpanded, setWasExpanded] = useState(false);
  if (expanded && !wasExpanded) {
    setWasExpanded(true);
  }

  const isCollapsing = !expanded && wasExpanded;

  const allSkills = useMemo(() => categories.flatMap((c) => c.skills), [categories]);

  const activeId = hoveredId ?? tappedId;

  const activeSkill = useMemo(
    () => allSkills.find((sk) => sk.id === activeId) ?? null,
    [allSkills, activeId],
  );

  const totalLines = useMemo(
    () => categories.reduce((sum, cat) => sum + 1 + cat.skills.length, 0),
    [categories],
  );

  const handleLeafTap = useCallback((skillId: string) => {
    setTappedId((prev) => (prev === skillId ? null : skillId));
  }, []);

  useEffect(() => {
    const desc = activeSkill?.description ?? '';

    if (desc === prevDescRef.current) return;
    prevDescRef.current = desc;
    setTypedText('');

    if (!desc) return;

    let i = 0;
    const timer = setInterval(() => {
      i++;
      setTypedText(desc.slice(0, i));
      if (i >= desc.length) clearInterval(timer);
    }, 28);

    return () => clearInterval(timer);
  }, [activeSkill]);

  let lineIdx = 0;

  const treeClass = [s.skillTree, expanded ? s.expanded : '', isCollapsing ? s.collapsing : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={treeClass}>
      <div className={s.treeBody}>
        <div className={s.treeLeft}>
          <div className={s.trunk}>
            {categories.map((cat, ci) => {
              const isLastBranch = ci === categories.length - 1;
              const branchIdx = lineIdx++;
              return (
                <div
                  key={cat.id}
                  className={`${s.branch} ${isLastBranch ? s.last : ''}`}
                  style={
                    {
                      '--delay': branchIdx,
                      '--delay-rev': totalLines - 1 - branchIdx,
                    } as React.CSSProperties
                  }
                >
                  <div className={s.branchHeader}>
                    <span className={s.branchName}>{cat.name}</span>
                    <span className={s.branchLine} aria-hidden="true">
                      {'─'.repeat(24)}
                    </span>
                    <span className={s.branchCount}>[{cat.skills.length}]</span>
                  </div>

                  <div className={s.leaves}>
                    {cat.skills.map((skill, si) => {
                      const isLastLeaf = si === cat.skills.length - 1;
                      const isActive = activeId === skill.id;
                      const leafIdx = lineIdx++;
                      return (
                        <div
                          key={skill.id}
                          className={[s.leaf, isLastLeaf ? s.last : '', isActive ? s.hovered : '']
                            .filter(Boolean)
                            .join(' ')}
                          style={
                            {
                              '--delay': leafIdx,
                              '--delay-rev': totalLines - 1 - leafIdx,
                            } as React.CSSProperties
                          }
                          onMouseEnter={() => setHoveredId(skill.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          onClick={() => handleLeafTap(skill.id)}
                          /* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the leaf contains block layout and an inline description panel. */
                          role="button"
                          tabIndex={0}
                          aria-label={skill.name}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              handleLeafTap(skill.id);
                            }
                          }}
                        >
                          <div className={s.leafRow}>
                            <span className={s.leafName}>{skill.name}</span>
                            <span className={s.leafBar}>
                              {Array.from({ length: 10 }, (_, i) => (
                                <span
                                  key={i}
                                  className={`${s.barSeg} ${i < skill.level ? s.filled : s.empty}`}
                                />
                              ))}
                            </span>
                            <span className={s.leafLvl}>{skill.level}</span>
                          </div>
                          {isActive && skill.description && (
                            <div className={s.leafDescMobile}>
                              <span>{typedText}</span>
                              <span className={s.infoCursor}>▌</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={s.treeRight}>
          {activeSkill ? (
            <div className={s.infoPanel} key={activeSkill.id}>
              <div className={s.infoPanelHeader}>
                <span className={s.infoPanelTitle}>{activeSkill.name}</span>
                <span className={s.infoPanelLevel}>LV.{activeSkill.level}</span>
              </div>
              <div className={s.infoPanelBody}>
                <span>{typedText}</span>
                <span className={s.infoCursor}>▌</span>
              </div>
            </div>
          ) : (
            <div className={s.infoEmpty}>
              <span>{t('inspectHint')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

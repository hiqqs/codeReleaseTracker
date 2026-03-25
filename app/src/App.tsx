import { useEffect, useMemo, useState } from 'react'
import logo from './assets/codeReleaseTrackerLogo.png'
import heroBg from './assets/codeReleaseTrackerBg.png'
import type { FormEvent } from 'react'
import type { Release, Repository } from './models'
import './App.css'

const generateId = () => {
  return (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2))
}

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return value
  }
}

function App() {
  const [releases, setReleases] = useState<Release[]>([])
  const [releaseForm, setReleaseForm] = useState({
    name: '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
  })
  const [repoForm, setRepoForm] = useState({
    releaseId: '',
    name: '',
    version: '',
    tag: '',
  })

  useEffect(() => {
    if (!repoForm.releaseId && releases.length) {
      setRepoForm((form) => ({ ...form, releaseId: releases[0].id }))
    }
  }, [releases, repoForm.releaseId])

  const totalRepositories = useMemo(
    () => releases.reduce((sum, release) => sum + release.repositories.length, 0),
    [releases]
  )

  const releaseFormValid = releaseForm.name.trim() && releaseForm.date
  const repoFormValid =
    repoForm.releaseId && repoForm.name.trim() && repoForm.version.trim()

  const handleReleaseSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!releaseFormValid) return

    const newRelease: Release = {
      id: generateId(),
      name: releaseForm.name.trim(),
      date: releaseForm.date,
      description: releaseForm.description.trim(),
      repositories: [],
    }

    setReleases((previous) => [newRelease, ...previous])
    setReleaseForm({
      name: '',
      date: new Date().toISOString().slice(0, 10),
      description: '',
    })
    setRepoForm((form) => ({ ...form, releaseId: newRelease.id }))
  }

  const handleRepoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!repoFormValid) return

    const newRepo: Repository = {
      id: generateId(),
      name: repoForm.name.trim(),
      version: repoForm.version.trim(),
      tag: repoForm.tag.trim() || undefined,
    }

    setReleases((previous) =>
      previous.map((release) =>
        release.id === repoForm.releaseId
          ? {
              ...release,
              repositories: [...release.repositories, newRepo],
            }
          : release
      )
    )

    setRepoForm((form) => ({
      ...form,
      name: '',
      version: '',
      tag: '',
    }))
  }

  return (
    <div className="app-shell">
      <div className="hero-root">
        <div className="hero-bg" style={{ backgroundImage: `url(${heroBg})` }} />
        <header className="hero">
        <div className="badge">
            <img src={logo} alt="Code Release Tracker logo" />
          </div>
          <div className="hero-copy">
            <p className="eyebrow">Mission Control</p>
            <h1>Release manifests that keep services, versions, and tags in sync.</h1>
            <p className="hero-subhead">
              Build a release once, then effortlessly attach every affected repository so
              the whole picture stays aligned.
            </p>
            <div className="hero-stats">
              <div>
                <strong>{releases.length}</strong>
                <span>Releases</span>
              </div>
              <div>
                <strong>{totalRepositories}</strong>
                <span>Repositories</span>
              </div>
            </div>
          </div>
        </header>
      </div>

      <main>
        <section className="panel release-panel">
          <header>
            <p className="eyebrow">Capture a release</p>
            <h2>Create a release manifest</h2>
            <p>
              Give the release a name, date, and short description so collaborators know what
              ships together.
            </p>
          </header>
          <form onSubmit={handleReleaseSubmit}>
            <div className="form-grid">
              <label>
                Release name
                <input
                  value={releaseForm.name}
                  onChange={(event) =>
                    setReleaseForm((form) => ({ ...form, name: event.target.value }))
                  }
                  placeholder="Sprint 15, Platform release"
                />
              </label>
              <label>
                Release date
                <input
                  type="date"
                  value={releaseForm.date}
                  onChange={(event) =>
                    setReleaseForm((form) => ({ ...form, date: event.target.value }))
                  }
                />
              </label>
              <label className="full-column">
                Description
                <textarea
                  value={releaseForm.description}
                  onChange={(event) =>
                    setReleaseForm((form) => ({ ...form, description: event.target.value }))
                  }
                  placeholder="What business need does this release satisfy?"
                />
              </label>
            </div>
            <button type="submit" className="primary" disabled={!releaseFormValid}>
              Save release
            </button>
          </form>
        </section>

        <section className="panel repo-panel">
          <header>
            <p className="eyebrow">Associate services</p>
            <h2>Add repositories</h2>
            <p>Select a release and add the services with their version and optional tags.</p>
          </header>
          <form onSubmit={handleRepoSubmit}>
            <div className="form-grid">
              <label>
                Target release
                <select
                  value={repoForm.releaseId}
                  onChange={(event) =>
                    setRepoForm((form) => ({ ...form, releaseId: event.target.value }))
                  }
                >
                  <option value="">Select release</option>
                  {releases.map((release) => (
                    <option key={release.id} value={release.id}>
                      {release.name} — {formatDate(release.date)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Repository name
                <input
                  value={repoForm.name}
                  onChange={(event) =>
                    setRepoForm((form) => ({ ...form, name: event.target.value }))
                  }
                  placeholder="service-accounts"
                />
              </label>
              <label>
                Version
                <input
                  value={repoForm.version}
                  onChange={(event) =>
                    setRepoForm((form) => ({ ...form, version: event.target.value }))
                  }
                  placeholder="v1.2.0"
                />
              </label>
              <label>
                Tag (optional)
                <input
                  value={repoForm.tag}
                  onChange={(event) =>
                    setRepoForm((form) => ({ ...form, tag: event.target.value }))
                  }
                  placeholder="stable | edge"
                />
              </label>
            </div>
            <button type="submit" className="secondary" disabled={!repoFormValid}>
              Attach repository
            </button>
          </form>
        </section>

        <section className="panel release-feed">
          <header>
            <div>
              <p className="eyebrow">Release history</p>
              <h2>Releases & repositories</h2>
            </div>
            <div className="summary">
              <p>{releases.length} releases</p>
              <p>{totalRepositories} repositories</p>
            </div>
          </header>
          {releases.length === 0 ? (
            <p className="empty-state">
              Start by creating your first release. Each release can later gather any number
              of services or repositories.
            </p>
          ) : (
            <div className="release-grid">
              {releases.map((release) => (
                <article key={release.id} className="release-card">
                  <div className="release-card__header">
                    <div>
                      <p className="release-card__date">{formatDate(release.date)}</p>
                      <h3>{release.name}</h3>
                    </div>
                    <span className="badge-tag">{release.repositories.length} repos</span>
                  </div>
                  {release.description && <p className="release-card__description">{release.description}</p>}
                  {release.repositories.length === 0 ? (
                    <p className="empty-row">Add repositories to surface the services.</p>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>Repository</th>
                          <th>Version</th>
                          <th>Tag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {release.repositories.map((repository) => (
                          <tr key={repository.id}>
                            <td>{repository.name}</td>
                            <td>{repository.version}</td>
                            <td>{repository.tag || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App

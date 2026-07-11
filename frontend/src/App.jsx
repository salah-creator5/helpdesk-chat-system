import React, { useState, useEffect } from 'react';
import { ChatWidget, ChatDashboard, chatApi } from './features/chat';

function App() {
  const [view, setView] = useState('menu'); // 'menu', 'client', 'agent'
  const [clientUser, setClientUser] = useState({ id: null, username: '', role: 'client' });
  const [agentUser, setAgentUser] = useState({ id: null, username: 'Agent_Sofia', role: 'agent' });
  const [isClientLoggedIn, setIsClientLoggedIn] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');

  // Verify backend availability and auto-initialize the Agent
  useEffect(() => {
    async function initDemo() {
      try {
        setConnectionStatus('checking');
        
        // Auto-create/retrieve Agent_Sofia in the backend on startup
        const resAgent = await chatApi.createDemoUser(agentUser.username, 'agent');
        setAgentUser(prev => ({
          ...prev,
          id: resAgent.user.id,
          username: resAgent.user.username
        }));

        setConnectionStatus('connected');
      } catch (err) {
        console.error('Django server is offline:', err);
        setConnectionStatus('error');
      }
    }
    initDemo();
  }, []);

  const handleClientLogin = async (e) => {
    e.preventDefault();
    const username = e.target.username.value.trim();
    if (!username) return;
    try {
      setConnectionStatus('checking');
      const res = await chatApi.createDemoUser(username, 'client');
      setClientUser({
        id: res.user.id,
        username: res.user.username,
        role: 'client'
      });
      setIsClientLoggedIn(true);
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Failed to login client:', err);
      setConnectionStatus('error');
    }
  };

  const handleClientLogout = () => {
    setClientUser({ id: null, username: '', role: 'client' });
    setIsClientLoggedIn(false);
  };

  // 1. Role Selection Menu
  if (view === 'menu') {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh', 
        backgroundColor: '#0f172a', 
        color: 'white', 
        fontFamily: 'Inter, sans-serif',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Instant Messaging Module
          </span>
          <h1 style={{ fontSize: '36px', fontWeight: 800, marginTop: '8px', background: 'linear-gradient(135deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Gestion des Demandes Client
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '16px', marginTop: '12px', maxWidth: '500px' }}>
            Choisissez l'interface à simuler pour tester le système de chat d'assistance en direct.
          </p>
        </div>

        {/* Roles Selection Cards */}
        <div style={{ 
          display: 'flex', 
          gap: '24px', 
          maxWidth: '800px', 
          width: '100%', 
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {/* Card: Espace Client */}
          <div 
            onClick={() => setView('client')}
            style={{ 
              flex: '1 1 300px', 
              backgroundColor: '#1e293b', 
              borderRadius: '16px', 
              padding: '30px', 
              border: '1px solid #334155', 
              cursor: 'pointer',
              transition: 'transform 0.2s, border-color 0.2s',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = '#38bdf8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#334155';
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>👤</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'white' }}>Espace Client</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.5' }}>
              Accédez au portail utilisateur. Vous pourrez vous connecter avec n'importe quel nom pour ouvrir un chat d'assistance dédié.
            </p>
            <div style={{ marginTop: '24px', color: '#38bdf8', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Entrer dans l'espace client ➔
            </div>
          </div>

          {/* Card: Back Office Agent */}
          <div 
            onClick={() => setView('agent')}
            style={{ 
              flex: '1 1 300px', 
              backgroundColor: '#1e293b', 
              borderRadius: '16px', 
              padding: '30px', 
              border: '1px solid #334155', 
              cursor: 'pointer',
              transition: 'transform 0.2s, border-color 0.2s',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = '#818cf8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#334155';
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎧</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'white' }}>Back Office Agent</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.5' }}>
              Accédez à la plateforme de gestion des agents pour répondre aux clients, s'assigner les conversations et clore les tickets.
            </p>
            <div style={{ marginTop: '24px', color: '#818cf8', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Ouvrir le tableau de bord agent ➔
            </div>
          </div>
        </div>

        {/* API Status Info */}
        <div style={{ marginTop: '40px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#cbd5e1' }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: connectionStatus === 'connected' ? '#10b981' : connectionStatus === 'checking' ? '#f59e0b' : '#ef4444' 
          }}></span>
          <span>
            {connectionStatus === 'connected' ? 'Django API Connecté' : connectionStatus === 'checking' ? 'Connexion en cours...' : 'Erreur: Serveur Django injoignable'}
          </span>
        </div>
      </div>
    );
  }

  // 2. Client Portal View
  if (view === 'client') {
    // If not logged in, show Espace Client Login Form
    if (!isClientLoggedIn) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh', 
          backgroundColor: '#0f172a', 
          color: 'white', 
          fontFamily: 'Inter, sans-serif',
          padding: '20px'
        }}>
          <button 
            onClick={() => setView('menu')}
            style={{ 
              position: 'absolute',
              top: '24px',
              left: '24px',
              padding: '8px 16px', 
              fontSize: '13px', 
              fontWeight: 600, 
              color: '#cbd5e1', 
              backgroundColor: '#1e293b', 
              border: '1px solid #334155', 
              borderRadius: '8px', 
              cursor: 'pointer' 
            }}
          >
            ← Retour
          </button>

          <form onSubmit={handleClientLogin} style={{ 
            maxWidth: '400px', 
            width: '100%', 
            backgroundColor: '#1e293b', 
            borderRadius: '16px', 
            padding: '36px', 
            border: '1px solid #334155', 
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: 'white' }}>Connexion Client</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
              Entrez votre nom pour simuler votre connexion sur l'espace client.
            </p>

            <div style={{ textAlign: 'left', marginBottom: '20px' }}>
              <label htmlFor="username" style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                Nom d'utilisateur
              </label>
              <input 
                type="text" 
                id="username" 
                name="username" 
                placeholder="Ex: Mathieu, Alice, Bob..." 
                required 
                style={{ 
                  width: '100%', 
                  padding: '12px 14px', 
                  borderRadius: '8px', 
                  backgroundColor: '#0f172a', 
                  border: '1px solid #334155', 
                  color: 'white', 
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button 
              type="submit" 
              style={{ 
                width: '100%', 
                padding: '12px', 
                borderRadius: '8px', 
                backgroundColor: '#38bdf8', 
                color: '#0f172a', 
                fontWeight: 700, 
                fontSize: '14px', 
                border: 'none', 
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7dd3fc'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#38bdf8'}
            >
              Accéder au Portail
            </button>
          </form>
        </div>
      );
    }

    // If logged in, show Espace Client Dashboard
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f8fafc', color: '#1e293b', fontFamily: 'Inter, sans-serif' }}>
        {/* Navigation Bar */}
        <header style={{ 
          padding: '16px 24px', 
          backgroundColor: 'white', 
          borderBottom: '1px solid #e2e8f0', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <button 
            onClick={() => setView('menu')}
            style={{ 
              padding: '8px 16px', 
              fontSize: '13px', 
              fontWeight: 600, 
              color: '#475569', 
              backgroundColor: '#f1f5f9', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer' 
            }}
          >
            ← Retour à l'accueil
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '14px', color: '#64748b' }}>
              Client : <strong style={{ color: '#0f172a' }}>{clientUser.username}</strong>
            </span>
            <button 
              onClick={handleClientLogout}
              style={{ 
                padding: '6px 12px', 
                fontSize: '12px', 
                fontWeight: 600, 
                color: '#ef4444', 
                backgroundColor: '#fee2e2', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer' 
              }}
            >
              Déconnexion
            </button>
          </div>
        </header>

        {/* Mock Host Client Panel */}
        <main style={{ flex: 1, padding: '40px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ maxWidth: '600px', width: '100%', backgroundColor: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Portail Client Hôte</span>
            <h1 style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: '#0f172a' }}>Mon Espace Personnel</h1>
            <p style={{ color: '#475569', fontSize: '14px', marginTop: '12px', lineHeight: '1.6' }}>
              Bienvenue sur votre espace client, <strong>{clientUser.username}</strong>. D'ici vous pouvez gérer vos contrats et suivre vos demandes en cours. 
            </p>
            <p style={{ color: '#475569', fontSize: '14px', marginTop: '8px', lineHeight: '1.6' }}>
              Si vous avez la moindre question ou si vous rencontrez un dysfonctionnement technique, veuillez cliquer sur l'icône de messagerie en bas à droite pour démarrer une session avec un agent de notre helpdesk.
            </p>
            <div style={{ border: '2px dashed #e2e8f0', padding: '30px', borderRadius: '12px', marginTop: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
              [ Contenu factice de la plateforme client ]
            </div>
          </div>
        </main>

        {/* Integration of Chat Widget */}
        {connectionStatus === 'connected' && <ChatWidget user={clientUser} />}
      </div>
    );
  }

  // 3. Agent Back Office View
  if (view === 'agent') {
    // If logged in, show Agent Dashboard (No login form needed for agent)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
        {/* Navigation Bar */}
        <header style={{ 
          padding: '16px 24px', 
          backgroundColor: '#1e293b', 
          borderBottom: '1px solid #334155', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexShrink: 0
        }}>
          <button 
            onClick={() => setView('menu')}
            style={{ 
              padding: '8px 16px', 
              fontSize: '13px', 
              fontWeight: 600, 
              color: 'white', 
              backgroundColor: '#334155', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer' 
            }}
          >
            ← Retour à l'accueil
          </button>
          <div style={{ fontSize: '14px', color: '#cbd5e1' }}>
            Agent connecté : <strong>{agentUser.username}</strong>
          </div>
        </header>

        {/* Workspace: Agent Chat Dashboard */}
        <main style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ChatDashboard user={agentUser} />
        </main>
      </div>
    );
  }

  return null;
}

export default App;

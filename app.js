// Backup CDN for Supabase if primary fails
function loadSupabaseFromBackup() {
    console.log('Primary Supabase CDN failed, trying backup...');
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
    script.onload = () => console.log('Backup Supabase library loaded');
    script.onerror = () => {
        console.error('Both Supabase CDNs failed. App will work in offline mode.');
        showStatus('⚠️ Database connection unavailable. Some features may not work.');
    };
    document.head.appendChild(script);
}


    // Wait for Supabase to load before initializing
    function initializeApp() {
    if (typeof window.supabase === 'undefined') {
    console.log('Waiting for Supabase to load...');
    setTimeout(initializeApp, 100);
    return;
}

    console.log('Supabase loaded, initializing app...');

    // Supabase configuration
    const SUPABASE_URL = 'https://wrcubaduypnqudrsaitj.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyY3ViYWR1eXBucXVkcnNhaXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1OTg3OTksImV4cCI6MjA2NjE3NDc5OX0.GYQeXfmsYssOFCiPcjdi1gub1lEUshTwlJ90EnyrlqY';

    // Initialize Supabase client
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized');
}

    // Start initialization when page loads
    document.addEventListener('DOMContentLoaded', initializeApp);

    // Supabase configuration
    const SUPABASE_URL = 'https://wrcubaduypnqudrsaitj.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyY3ViYWR1eXBucXVkcnNhaXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1OTg3OTksImV4cCI6MjA2NjE3NDc5OX0.GYQeXfmsYssOFCiPcjdi1gub1lEUshTwlJ90EnyrlqY';

    // Initialize Supabase client (with fallback)
    let supabase;
    function getSupabase() {
    if (!supabase) {
    if (window.supabaseClient) {
    supabase = window.supabaseClient;
} else if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error('Supabase not loaded yet');
    return null;
}
}
    return supabase;
}

    // Global variables
    let currentRole = null;
    let roomCode = null;
    let roomId = null;
    let queue = [];
    let currentSongIndex = -1;
    let player = null;
    let isPlaying = false;
    let userName = '';
    let queueSubscription = null;
    let roomSubscription = null;

    // Store user name in memory (since localStorage is not available)
    let storedUserData = { name: '' };

    function storeUserName(name) {
    storedUserData.name = name;
}

    function getUserName() {
    return storedUserData.name;
}

    // Initialize user on page load
    function initializeUser() {
    // Try to get stored name first
    const storedName = getUserName();

    if (storedName) {
    userName = storedName;
    showStatus(`👋 Welcome back, ${userName}!`);
} else {
    // Prompt for name and store it
    promptForName();
}
}

    // Prompt user for their name
    function promptForName() {
    let name = '';
    while (!name || name.trim().length === 0) {
    name = prompt('🎵 Welcome to Party Jukebox! What\'s your name?');
    if (name === null) {
    // User cancelled, use default
    name = 'Anonymous';
    break;
}
    name = name.trim();
    if (name.length === 0) {
    alert('Please enter a valid name!');
}
}

    userName = name;
    storeUserName(userName);
    showStatus(`🎉 Hey ${userName}! Ready to add some music?`);
}

    // Generate a random room code
    function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
}
    return result;
}

    // Set user role (host or guest)
    function setRole(role) {
    currentRole = role;
    document.getElementById('roleSelection').classList.add('hidden');

    if (role === 'host') {
    setupHost();
} else {
    setupGuest();
}
}

    // Setup host interface
    async function setupHost() {
    roomCode = generateRoomCode();
    document.getElementById('roomCode').textContent = roomCode;
    document.getElementById('hostSetup').classList.remove('hidden');
    document.getElementById('playerSection').classList.remove('hidden');
    document.getElementById('addSongSection').classList.remove('hidden');
    document.getElementById('queueSection').classList.remove('hidden');

    // Update room status
    updateRoomStatus(`Creating room ${roomCode}...`);

    // Generate QR code
    const shareUrl = window.location.origin + window.location.pathname + '?room=' + roomCode;
    document.getElementById('shareLink').textContent = shareUrl;

    // Generate QR code with fallback
    generateQRCode(shareUrl);

    // Initialize YouTube player
    loadYouTubeAPI();

    // Create room in Supabase
    const result = await createRoom();
    if (result) {
    updateRoomStatus(`🎉 Room ${roomCode} is ready! (ID: ${roomId})`);
    showStatus('🎉 Party room created! Share the code with your friends.');
} else {
    updateRoomStatus('❌ Failed to create room');
}
}

    // Setup guest interface
    async function setupGuest() {
    document.getElementById('guestJoin').classList.remove('hidden');

    // Check if room code is in URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomCode = urlParams.get('room');
    if (urlRoomCode) {
    document.getElementById('joinCode').value = urlRoomCode;
    showStatus(`🔍 Found room code in URL: ${urlRoomCode}`);
    // Auto-join if valid room code in URL
    setTimeout(async () => {
    await joinRoom();
}, 1000);
}
}

    // Join a room as guest
    async function joinRoom() {
    const code = document.getElementById('joinCode').value.toUpperCase();
    if (code.length !== 6) {
    showStatus('❌ Please enter a valid 6-character room code.');
    return;
}

    updateRoomStatus(`Joining room ${code}...`);
    showStatus(`🔍 Trying to join room ${code}...`);

    // Try to join the room
    const room = await joinExistingRoom(code);
    if (!room) {
    updateRoomStatus('❌ Failed to join room');
    return; // Error message already shown
}

    roomCode = code;
    document.getElementById('guestJoin').classList.add('hidden');
    document.getElementById('addSongSection').classList.remove('hidden');
    document.getElementById('queueSection').classList.remove('hidden');

    updateRoomStatus(`✅ Connected to room ${roomCode} (ID: ${roomId})`);
    showStatus(`🎵 Welcome ${userName}! You've joined room ${roomCode}.`);
}

    // Update room status display
    function updateRoomStatus(message) {
    const statusElement = document.getElementById('roomStatus');
    if (statusElement) {
    statusElement.textContent = message;
}
}

    // Generate QR code with fallback
    function generateQRCode(url) {
    const qrContainer = document.getElementById('qrcode');

    if (typeof QRCode !== 'undefined') {
    // Clear any existing content
    qrContainer.innerHTML = '';

    // Create QR code using qrcodejs library
    new QRCode(qrContainer, {
    text: url,
    width: 200,
    height: 200,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
});
} else {
    // Fallback: create a simple placeholder
    qrContainer.innerHTML = `
                    <div style="width: 200px; height: 200px; background: white; border: 2px solid #ccc; display: flex; flex-direction: column; justify-content: center; align-items: center; font-family: Arial; color: #333;">
                        <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">QR Code</div>
                        <div style="font-size: 12px; text-align: center; padding: 0 10px;">Scan with phone camera</div>
                        <div style="font-size: 10px; margin-top: 10px; opacity: 0.7;">Loading...</div>
                    </div>
                `;

    // Try to load QR library again
    setTimeout(() => {
    if (typeof QRCode !== 'undefined') {
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
    text: url,
    width: 200,
    height: 200,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
});
}
}, 1000);
}
}

    // Create or get room in Supabase
    async function createRoom() {
    const supabase = getSupabase();
    if (!supabase) {
    showStatus('❌ Database connection not ready. Please wait and try again.');
    return null;
}

    try {
    console.log('Creating room with code:', roomCode, 'for host:', userName);

    const { data, error } = await supabase
    .from('rooms')
    .insert([
{
    code: roomCode,
    host_name: userName,
    current_song_index: -1
}
    ])
    .select()
    .single();

    if (error) {
    console.error('Room creation error:', error);
    showStatus('❌ Error creating room. Please try again.');
    return null;
}

    roomId = data.id;
    console.log('Room created successfully:', data);
    showStatus(`✅ Room ${roomCode} created! Room ID: ${roomId}`);

    // Subscribe to room updates
    subscribeToRoom();
    subscribeToQueue();

    return data;
} catch (error) {
    console.error('Unexpected error creating room:', error);
    showStatus('❌ Unexpected error creating room. Please try again.');
    return null;
}
}

    // Join existing room
    async function joinExistingRoom(code) {
    const supabase = getSupabase();
    if (!supabase) {
    showStatus('❌ Database connection not ready. Please wait and try again.');
    return null;
}

    try {
    console.log('Looking for room with code:', code);

    const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code)
    .single();

    if (error) {
    console.error('Room lookup error:', error);
    if (error.code === 'PGRST116') {
    showStatus('❌ Room not found. Please check the code.');
} else {
    showStatus('❌ Error connecting to room. Please try again.');
}
    return null;
}

    roomId = data.id;
    roomCode = code;
    currentSongIndex = data.current_song_index || -1;

    console.log('Successfully joined room:', data);
    showStatus(`✅ Connected to room hosted by ${data.host_name}`);

    // Load existing queue
    await loadQueue();

    // Subscribe to updates
    subscribeToRoom();
    subscribeToQueue();

    return data;
} catch (error) {
    console.error('Unexpected error joining room:', error);
    showStatus('❌ Unexpected error. Please try again.');
    return null;
}
}

    // Subscribe to room updates (for current song tracking)
    function subscribeToRoom() {
    if (!roomId) {
    console.error('Cannot subscribe to room without roomId');
    return;
}

    const supabase = getSupabase();
    if (!supabase) return;

    console.log('Subscribing to room updates for room:', roomId);

    roomSubscription = supabase
    .channel(`room-${roomId}`)
    .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'rooms',
    filter: `id=eq.${roomId}`
}, (payload) => {
    console.log('Room change received:', payload);
    if (currentRole !== 'host') {
    currentSongIndex = payload.new.current_song_index;
    updateQueue();
}
})
    .subscribe((status) => {
    console.log('Room subscription status:', status);
});
}

    // Subscribe to queue updates
    function subscribeToQueue() {
    if (!roomId) {
    console.error('Cannot subscribe to queue without roomId');
    return;
}

    const supabase = getSupabase();
    if (!supabase) return;

    console.log('Subscribing to queue updates for room:', roomId);

    queueSubscription = supabase
    .channel(`queue-${roomId}`)
    .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'queue',
    filter: `room_id=eq.${roomId}`
}, (payload) => {
    console.log('Queue change received:', payload);
    loadQueue();

    if (payload.eventType === 'INSERT') {
    const newSong = payload.new;
    showStatus(`🎵 ${newSong.added_by} added "${newSong.title}"`);
}
})
    .subscribe((status) => {
    console.log('Queue subscription status:', status);
});
}

    // Load queue from Supabase
    async function loadQueue() {
    if (!roomId) {
    console.error('No roomId available for loading queue');
    return;
}

    const supabase = getSupabase();
    if (!supabase) return;

    try {
    console.log('Loading queue for room ID:', roomId);

    const { data, error } = await supabase
    .from('queue')
    .select('*')
    .eq('room_id', roomId)
    .order('position');

    if (error) {
    console.error('Queue loading error:', error);
    return;
}

    console.log('Loaded queue data:', data);

    queue = data.map(item => ({
    id: item.id,
    videoId: item.video_id,
    title: item.title,
    addedBy: item.added_by,
    votes: item.votes || 0
}));

    console.log('Processed queue:', queue);
    updateQueue();

    if (queue.length > 0) {
    showStatus(`📋 Loaded ${queue.length} song${queue.length > 1 ? 's' : ''} from queue`);
}
} catch (error) {
    console.error('Unexpected error loading queue:', error);
}
}

    // Load YouTube API
    function loadYouTubeAPI() {
    if (typeof YT === 'undefined') {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}
}

    // YouTube API ready callback
    function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '315',
        width: '100%',
        playerVars: {
            'playsinline': 1,
            'controls': 1,
            'rel': 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

    function onPlayerReady(event) {
    console.log('Player ready');
}

    function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
    nextSong();
} else if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    document.getElementById('playPauseBtn').textContent = '⏸️ Pause';
} else if (event.data === YT.PlayerState.PAUSED) {
    isPlaying = false;
    document.getElementById('playPauseBtn').textContent = '▶️ Play';
}
}

    // Extract YouTube video ID from URL
    function extractYouTubeID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

    // Fetch YouTube video title
    async function getYouTubeTitle(videoId) {
    try {
    // Use YouTube's oEmbed API to get video info
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);

    if (response.ok) {
    const data = await response.json();
    return data.title;
} else {
    throw new Error('Failed to fetch video info');
}
} catch (error) {
    console.error('Error fetching YouTube title:', error);
    return `YouTube Video (${videoId})`;
}
}

    // Simulate YouTube search (in real app, use YouTube Data API)
    async function searchYouTube(query) {
    // This is a demo function. In a real app, you'd use YouTube Data API
    // For now, we'll return some common songs based on keywords

    const commonSongs = {
    'hello': { videoId: '1RHBAd5Tj_o', title: 'Adele - Hello' },
    'shape of you': { videoId: 'JGwWNGJdvx8', title: 'Ed Sheeran - Shape of You' },
    'bohemian rhapsody': { videoId: 'fJ9rUzIMcZQ', title: 'Queen - Bohemian Rhapsody' },
    'imagine': { videoId: 'YkgkThdzX-8', title: 'John Lennon - Imagine' },
    'billie jean': { videoId: 'Zi_XLOBDo_Y', title: 'Michael Jackson - Billie Jean' },
    'hotel california': { videoId: 'BciS5krYL80', title: 'Eagles - Hotel California' },
    'sweet child': { videoId: '1w7OgIMMRc4', title: 'Guns N\' Roses - Sweet Child O\' Mine' },
    'stairway to heaven': { videoId: 'QkF3oxziUI4', title: 'Led Zeppelin - Stairway to Heaven' },
    'yesterday': { videoId: 'NrgmdVjpVws', title: 'The Beatles - Yesterday' },
    'like a rolling stone': { videoId: 'IwOfCgkyEj0', title: 'Bob Dylan - Like a Rolling Stone' }
};

    const lowerQuery = query.toLowerCase();

    // Check if query matches any common songs
    for (const [key, song] of Object.entries(commonSongs)) {
    if (lowerQuery.includes(key) || key.includes(lowerQuery)) {
    return song;
}
}

    // No match found
    return { videoId: null, title: null };
}

    // Add song to queue
    async function addSong() {
    // Check if user has joined/created a room
    if (!roomId || !roomCode) {
    showStatus('❌ Please create or join a room first before adding songs.');
    return;
}

    const input = document.getElementById('songSearch');
    const query = input.value.trim();

    if (!query) {
    showStatus('❌ Please enter a song name or YouTube URL.');
    return;
}

    // Check if it's a YouTube URL
    const videoId = extractYouTubeID(query);

    if (videoId) {
    // It's a YouTube URL - fetch the actual title
    showStatus('🔍 Getting video info...');
    const title = await getYouTubeTitle(videoId);
    await addToQueue(videoId, title, userName);
} else {
    // It's a search query - simulate finding a song
    showStatus('🔍 Searching for "' + query + '"...');

    const searchResults = await searchYouTube(query);

    if (searchResults.videoId) {
    await addToQueue(searchResults.videoId, searchResults.title, userName);
} else {
    // Fallback to demo video with search term as title
    const demoVideoId = 'dQw4w9WgXcQ'; // Rick Roll as demo
    await addToQueue(demoVideoId, `"${query}" (Demo - Rick Roll)`, userName);
    showStatus('⚠️ Demo mode: Using placeholder video. In a real app, this would search YouTube.');
}
}

    input.value = '';
}

    // Add song to queue
    async function addToQueue(videoId, title, addedBy) {
    if (!roomId) {
    showStatus('❌ Please create or join a room first.');
    return;
}

    // Add to Supabase database
    const result = await addSongToDatabase(videoId, title, addedBy);

    if (result) {
    showStatus(`✅ "${title}" added to queue by ${addedBy}`);

    // If nothing is playing and this is the first song, start playing (host only)
    if (currentRole === 'host' && currentSongIndex === -1) {
    setTimeout(async () => {
    await loadQueue(); // Refresh queue first
    if (queue.length > 0 && currentSongIndex === -1) {
    await playNextSong();
}
}, 1000); // Wait a moment for the queue to update
}
}
}

    // Add song to Supabase
    async function addSongToDatabase(videoId, title, addedBy) {
    const supabase = getSupabase();
    if (!supabase) {
    showStatus('❌ Database connection not available.');
    return null;
}

    if (!roomId) {
    showStatus('❌ No room available. Please create or join a room first.');
    return null;
}

    try {
    const position = queue.length;

    const { data, error } = await supabase
    .from('queue')
    .insert([
{
    room_id: roomId,
    video_id: videoId,
    title: title,
    added_by: addedBy,
    votes: 0,
    position: position
}
    ])
    .select()
    .single();

    if (error) {
    console.error('Database error adding song:', error);
    showStatus('❌ Error adding song to database. Please try again.');
    return null;
}

    console.log('Song added to database:', data);
    return data;
} catch (error) {
    console.error('Error adding song:', error);
    showStatus('❌ Error adding song. Please try again.');
    return null;
}
}

    // Update queue display
    function updateQueue() {
    const queueList = document.getElementById('queueList');
    queueList.innerHTML = '';

    if (queue.length === 0) {
    queueList.innerHTML = '<p style="text-align: center; opacity: 0.7;">No songs in queue. Add some music!</p>';
    return;
}

    queue.forEach((song, index) => {
    const item = document.createElement('div');
    item.className = 'queue-item';

    const isCurrentSong = index === currentSongIndex;
    if (isCurrentSong) {
    item.style.background = 'rgba(255,255,255,0.2)';
    item.style.border = '2px solid rgba(255,255,255,0.3)';
}

    item.innerHTML = `
                    <div class="song-info">
                        <div class="song-name">${isCurrentSong ? '🎵 ' : ''}${song.title}</div>
                        <div class="added-by">Added by ${song.addedBy}</div>
                    </div>
                    <div class="vote-section">
                        <button class="vote-btn vote-up" onclick="vote(${song.id}, 1)">👍</button>
                        <div class="vote-count">${song.votes}</div>
                        <button class="vote-btn vote-down" onclick="vote(${song.id}, -1)">👎</button>
                        ${currentRole === 'host' ? `<button class="vote-btn" onclick="removeSong(${song.id})" style="background: #ff6b6b; margin-left: 10px;">❌</button>` : ''}
                    </div>
                `;

    queueList.appendChild(item);
});
}

    // Vote for a song
    async function vote(songId, direction) {
    const songIndex = queue.findIndex(song => song.id === songId);
    if (songIndex !== -1) {
    const newVotes = queue[songIndex].votes + direction;
    queue[songIndex].votes = newVotes;

    // Update vote in database
    await updateVoteInDatabase(songId, newVotes);

    // Update display immediately for better UX
    updateQueue();
}
}

    // Update vote in Supabase
    async function updateVoteInDatabase(songId, newVotes) {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
    const { error } = await supabase
    .from('queue')
    .update({ votes: newVotes })
    .eq('id', songId);

    if (error) throw error;
} catch (error) {
    console.error('Error updating vote:', error);
}
}

    // Remove song from queue (host only)
    async function removeSong(songId) {
    const songIndex = queue.findIndex(song => song.id === songId);
    if (songIndex !== -1) {
    if (songIndex === currentSongIndex) {
    nextSong();
} else {
    // Remove from database
    await removeSongFromDatabase(songId);
}
}
}

    // Remove song from Supabase
    async function removeSongFromDatabase(songId) {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
    const { error } = await supabase
    .from('queue')
    .delete()
    .eq('id', songId);

    if (error) throw error;
} catch (error) {
    console.error('Error removing song:', error);
}
}

    // Play next song
    async function playNextSong() {
    // Safety check - only hosts can control playback
    if (currentRole !== 'host') {
    console.log('Only hosts can control playback');
    return;
}

    // Safety check - make sure we have a room
    if (!roomId) {
    console.log('No room available for playback');
    return;
}

    if (queue.length === 0) {
    currentSongIndex = -1;
    document.getElementById('currentSongTitle').textContent = 'No songs in queue';
    await updateCurrentSongIndex(-1);
    return;
}

    currentSongIndex = (currentSongIndex + 1) % queue.length;
    const song = queue[currentSongIndex];

    if (player && player.loadVideoById) {
    player.loadVideoById(song.videoId);
    document.getElementById('currentSongTitle').textContent = song.title;

    // Update current song index in database (host only)
    await updateCurrentSongIndex(currentSongIndex);

    updateQueue();
}
}

    // Update current song index in Supabase (host only)
    async function updateCurrentSongIndex(index) {
    if (currentRole === 'host' && roomId) {
    try {
    const supabase = getSupabase();
    if (!supabase) {
    console.log('Supabase not available for updating current song');
    return;
}

    const { error } = await supabase
    .from('rooms')
    .update({ current_song_index: index })
    .eq('id', roomId);

    if (error) {
    console.error('Error updating current song:', error);
} else {
    console.log('Updated current song index to:', index);
}
} catch (error) {
    console.error('Error updating current song:', error);
}
}
}

    // Player controls
    async function togglePlayPause() {
    if (player && player.getPlayerState) {
    if (isPlaying) {
    player.pauseVideo();
} else {
    player.playVideo();
}
}
}

    async function nextSong() {
    await playNextSong();
}

    async function previousSong() {
    if (currentSongIndex > 0) {
    currentSongIndex -= 2; // Will be incremented in playNextSong
    await playNextSong();
}
}

    // Show status message
    function showStatus(message) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.classList.remove('hidden');

    setTimeout(() => {
    status.classList.add('hidden');
}, 5000);
}

    // Handle enter key in input fields
    document.addEventListener('DOMContentLoaded', function() {
    // Initialize user when page loads
    initializeUser();

    // Update display with current user name
    function updateUserDisplay() {
    const userNameDisplay = document.getElementById('currentUserName');
    if (userNameDisplay) {
    userNameDisplay.textContent = `👤 ${userName}`;
}
}

    // Update "adding as" display
    function updateAddingAsDisplay() {
    const addingAsElement = document.getElementById('addingSongAs');
    if (addingAsElement) {
    addingAsElement.textContent = userName;
}

    const roomCodeElement = document.getElementById('currentRoomCode');
    if (roomCodeElement) {
    roomCodeElement.textContent = roomCode || 'Not connected';
}
}

    // Update user display initially and whenever name changes
    updateUserDisplay();

    document.getElementById('songSearch').addEventListener('keypress', async function(e) {
    if (e.key === 'Enter') {
    await addSong();
}
});

    document.getElementById('joinCode').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
    joinRoom();
}
});

    // Update user display periodically in case name changes
    setInterval(() => {
    updateUserDisplay();
    updateAddingAsDisplay();
}, 1000);
});

    // Make YouTube API callback global
    window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { User, UserType, DonatedItem, ItemStatus, ChatThreads, ChatMessage } from './types';
import { getDonorReply, getNgoReply } from './services/geminiService';
import { HeartIcon, LogoutIcon, UserCircleIcon, CameraIcon, ChatBubbleIcon, SendIcon } from './components/icons';

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substring(2, 10);
const createChatThreadId = (donorId: string, ngoId: string, itemId: string) => `${donorId}_${ngoId}_${itemId}`;

// --- Initial Mock Data ---
const initialUsers: User[] = [
    { userId: 'donor1', fullName: 'Jane Donor', email: 'donor@example.com', userType: UserType.Donor },
    { userId: 'ngo1', fullName: 'GoodCause NGO', email: 'ngo@example.com', userType: UserType.NGO, ngoVerificationId: 'NGO-12345', address: '123 Charity Lane' },
];

const initialItems: DonatedItem[] = [
    { itemId: 'item1', donorId: 'donor1', itemName: 'Winter Coat', description: 'A warm, gently used winter coat, size L.', category: 'Clothing', imageUrl: 'https://picsum.photos/seed/coat/400/300', status: ItemStatus.Available },
    { itemId: 'item2', donorId: 'donor1', itemName: 'Canned Goods', description: 'A box of assorted canned vegetables and soups.', category: 'Food', imageUrl: 'https://picsum.photos/seed/food/400/300', status: ItemStatus.Reserved },
];

const initialChats: ChatThreads = {
    'donor1_ngo1_item2': [
        {
            messageId: 'msg1',
            senderId: 'ngo1',
            text: "Hi Jane, we're interested in the canned goods. Are they still available for pickup?",
            timestamp: new Date(Date.now() - 1000 * 60 * 5) // 5 minutes ago
        }
    ]
};

// --- Context for Auth ---
interface AppContextType {
    currentUser: User | null;
    login: (email: string) => void;
    logout: () => void;
    users: User[];
    addUser: (user: Omit<User, 'userId'>) => void;
    items: DonatedItem[];
    addItem: (item: Omit<DonatedItem, 'itemId'>) => void;
    updateItemStatus: (itemId: string, status: ItemStatus) => void;
    findUserById: (userId: string) => User | undefined;
    getChatThread: (threadId: string) => ChatMessage[];
    addMessageToThread: (threadId: string, message: Omit<ChatMessage, 'messageId' | 'timestamp'>) => void;
    setPage: (page: Page, context?: any) => void;
    chats: ChatThreads;
}
const AppContext = React.createContext<AppContextType | null>(null);

// --- Page Components (defined outside App to prevent re-renders) ---

type Page = 'login' | 'signup' | 'donorDashboard' | 'ngoDashboard' | 'itemUpload' | 'itemDetail' | 'chat';

const LoginPage: React.FC<{ setPage: (page: Page) => void, login: (email: string) => void }> = ({ setPage, login }) => {
    const [email, setEmail] = useState('donor@example.com');
    const [password, setPassword] = useState('password');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            login(email);
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="p-8 bg-white rounded-xl shadow-lg w-full max-w-md">
                <div className="flex justify-center mb-6">
                    <HeartIcon className="w-16 h-16 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-center text-dark mb-2">Welcome to AidBridge</h2>
                <p className="text-center text-gray-500 mb-8">Sign in to continue</p>
                {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                <form onSubmit={handleLogin}>
                    <input type="email" placeholder="Email (e.g., donor@example.com)" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 mb-4 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" />
                    <input type="password" placeholder="Password (any password)" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 mb-6 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none" />
                    <button type="submit" className="w-full bg-primary text-white p-3 rounded-lg font-semibold hover:bg-primary-hover transition-colors">Login</button>
                </form>
                <p className="text-center mt-6">
                    Don't have an account? <button onClick={() => setPage('signup')} className="text-primary font-semibold hover:underline">Sign Up</button>
                </p>
            </div>
        </div>
    );
};


const SignUpPage: React.FC<{ setPage: (page: Page) => void, addUser: (user: Omit<User, 'userId'>) => void }> = ({ setPage, addUser }) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [userType, setUserType] = useState<UserType>(UserType.Donor);

    const handleSignUp = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName || !email || !password) {
            alert("Please fill all fields.");
            return;
        }
        addUser({ fullName, email, userType });
    };

    return (
         <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="p-8 bg-white rounded-xl shadow-lg w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-dark mb-8">Create Account</h2>
                <form onSubmit={handleSignUp}>
                    <input type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-3 mb-4 border rounded-lg" required />
                    <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 mb-4 border rounded-lg" required />
                    <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 mb-6 border rounded-lg" required/>
                    <div className="mb-6">
                        <p className="font-semibold mb-2 text-gray-700">I am a:</p>
                        <div className="flex gap-4">
                            <label className="flex items-center p-3 border rounded-lg flex-1 cursor-pointer has-[:checked]:bg-blue-50 has-[:checked]:border-primary">
                                <input type="radio" name="userType" value={UserType.Donor} checked={userType === UserType.Donor} onChange={() => setUserType(UserType.Donor)} className="h-4 w-4 text-primary focus:ring-primary border-gray-300" />
                                <span className="ml-3 text-gray-800">Donor</span>
                            </label>
                            <label className="flex items-center p-3 border rounded-lg flex-1 cursor-pointer has-[:checked]:bg-blue-50 has-[:checked]:border-primary">
                                <input type="radio" name="userType" value={UserType.NGO} checked={userType === UserType.NGO} onChange={() => setUserType(UserType.NGO)} className="h-4 w-4 text-primary focus:ring-primary border-gray-300"/>
                                <span className="ml-3 text-gray-800">NGO</span>
                            </label>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-primary text-white p-3 rounded-lg font-semibold hover:bg-primary-hover transition-colors">Sign Up</button>
                </form>
                <p className="text-center mt-6">
                    Already have an account? <button onClick={() => setPage('login')} className="text-primary font-semibold hover:underline">Login</button>
                </p>
            </div>
        </div>
    );
};


const AppHeader: React.FC = () => {
    const context = React.useContext(AppContext);
    if (!context || !context.currentUser) return null;
    const { currentUser, logout } = context;

    return (
        <header className="bg-white shadow-md sticky top-0 z-10">
            <div className="container mx-auto px-6 py-3 flex justify-between items-center">
                 <div className="flex items-center space-x-2">
                    <HeartIcon className="w-8 h-8 text-primary"/>
                    <h1 className="text-2xl font-bold text-dark">AidBridge</h1>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                       <UserCircleIcon className="w-7 h-7 text-gray-500" />
                       <span className="text-gray-700 font-medium hidden sm:block">{currentUser.fullName}</span>
                    </div>
                    <button onClick={logout} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 transition-colors">
                        <LogoutIcon className="w-6 h-6 text-gray-600" />
                        <span className="text-gray-700 font-medium hidden sm:block">Logout</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

const DonorDashboard: React.FC = () => {
    const context = React.useContext(AppContext);
    if (!context || !context.currentUser) return null;
    const { currentUser, items, setPage, chats, findUserById } = context;

    const myItems = items.filter(item => item.donorId === currentUser!.userId);

    const statusColor = (status: ItemStatus) => {
        switch (status) {
            case ItemStatus.Available: return 'bg-green-100 text-green-800';
            case ItemStatus.Reserved: return 'bg-yellow-100 text-yellow-800';
            case ItemStatus.Donated: return 'bg-blue-100 text-blue-800';
        }
    };

    return (
        <div>
            <div className="bg-white p-8 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-bold text-dark mb-2">Welcome, {currentUser.fullName}!</h2>
                <p className="text-gray-600 mb-6">Ready to make a difference? Post an item for donation today.</p>
                <button onClick={() => setPage('itemUpload')} className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-hover transition-transform hover:scale-105">
                    Post a New Item for Donation
                </button>
            </div>
            <h3 className="text-xl font-bold text-dark mb-4">My Donations</h3>
            <div className="bg-white rounded-lg shadow-md">
                {myItems.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                        {myItems.map(item => {
                            const isReserved = item.status === ItemStatus.Reserved;
                            let otherUser: User | undefined;

                            if (isReserved) {
                                const threadKey = Object.keys(chats).find(key => 
                                    key.startsWith(`${currentUser.userId}_`) && key.endsWith(`_${item.itemId}`)
                                );
                                if (threadKey) {
                                    const ngoId = threadKey.split('_')[1];
                                    otherUser = findUserById(ngoId);
                                }
                            }
                            
                            const canChat = isReserved && otherUser;

                            const handleItemClick = () => {
                                if (canChat) {
                                    setPage('chat', { item, otherUser });
                                }
                            };

                            return (
                                <li key={item.itemId} onClick={handleItemClick} className={`p-4 flex justify-between items-center ${canChat ? 'hover:bg-gray-50 cursor-pointer transition-colors' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <img src={item.imageUrl} alt={item.itemName} className="w-16 h-16 rounded-md object-cover"/>
                                        <div>
                                            <p className="font-semibold text-dark">{item.itemName}</p>
                                            <p className="text-sm text-gray-500">{item.category}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {canChat && <ChatBubbleIcon className="w-5 h-5 text-primary" />}
                                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColor(item.status)}`}>{item.status}</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="p-6 text-center text-gray-500">You haven't posted any items yet.</p>
                )}
            </div>
        </div>
    );
};

const ItemUploadPage: React.FC = () => {
    const context = React.useContext(AppContext);
    if (!context || !context.currentUser) return null;
    const { currentUser, addItem, setPage } = context;

    const [itemName, setItemName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Clothing');
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const handleImageChange = () => {
        // In a real app, this would handle file selection. Here we just get a random pic.
        const seed = generateId();
        setImagePreview(`https://picsum.photos/seed/${seed}/400/300`);
    };
    
    useEffect(() => {
        handleImageChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemName || !description || !category || !imagePreview) {
            alert("Please fill all fields and select an image.");
            return;
        }
        addItem({
            donorId: currentUser!.userId,
            itemName,
            description,
            category,
            imageUrl: imagePreview,
            status: ItemStatus.Available
        });
        setPage('donorDashboard');
    };

    return (
        <div className="p-8 bg-white rounded-xl shadow-lg max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-dark mb-6">Post a New Item</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                 <div className="flex flex-col items-center p-6 border-2 border-dashed rounded-lg">
                    {imagePreview ? (
                        <img src={imagePreview} alt="Item preview" className="w-48 h-48 rounded-lg object-cover mb-4"/>
                    ) : (
                       <div className="w-48 h-48 rounded-lg bg-gray-100 flex flex-col items-center justify-center mb-4 text-gray-400">
                           <CameraIcon className="w-16 h-16"/>
                       </div>
                    )}
                    <button type="button" onClick={handleImageChange} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300">
                        Get New Random Image
                    </button>
                    <p className="text-xs text-gray-500 mt-2">This is a placeholder. In a real app, you'd upload a file.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                    <input type="text" value={itemName} onChange={e => setItemName(e.target.value)} className="w-full p-3 border rounded-lg" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full p-3 border rounded-lg" required></textarea>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 border rounded-lg bg-white">
                        <option>Clothing</option>
                        <option>Food</option>
                        <option>Electronics</option>
                        <option>Furniture</option>
                        <option>Books</option>
                        <option>Other</option>
                    </select>
                </div>
                <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setPage('donorDashboard')} className="w-full bg-gray-200 text-gray-800 p-3 rounded-lg font-semibold hover:bg-gray-300">Cancel</button>
                    <button type="submit" className="w-full bg-secondary text-white p-3 rounded-lg font-semibold hover:bg-secondary-hover">Submit Donation</button>
                </div>
            </form>
        </div>
    );
};

const NgoDashboard: React.FC = () => {
    const context = React.useContext(AppContext);
    if (!context) return null;
    const { items, setPage } = context;

    const [search, setSearch] = useState('');
    const availableItems = items
        .filter(item => item.status === ItemStatus.Available)
        .filter(item => item.itemName.toLowerCase().includes(search.toLowerCase()));

    return (
        <div>
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-bold text-dark mb-4">Available Donations</h2>
                <input type="text" placeholder="Search for items..." value={search} onChange={e => setSearch(e.target.value)} className="w-full p-3 border rounded-lg" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {availableItems.map(item => (
                    <div key={item.itemId} onClick={() => setPage('itemDetail', { item })} className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer group transition-transform hover:-translate-y-1">
                        <img src={item.imageUrl} alt={item.itemName} className="w-full h-48 object-cover"/>
                        <div className="p-4">
                            <h3 className="font-bold text-lg text-dark group-hover:text-primary transition-colors">{item.itemName}</h3>
                            <p className="text-sm text-gray-500">{item.category}</p>
                        </div>
                    </div>
                ))}
            </div>
            {availableItems.length === 0 && (
                <div className="bg-white p-8 rounded-lg shadow-md text-center">
                    <p className="text-gray-500">No available items match your search. Please check back later!</p>
                </div>
            )}
        </div>
    );
};

const ItemDetailPage: React.FC<{ item: DonatedItem }> = ({ item }) => {
    const context = React.useContext(AppContext);
    if (!context || !context.currentUser) return null;
    const { currentUser, findUserById, setPage, updateItemStatus } = context;

    const donor = findUserById(item.donorId);

    if (!donor) return <p>Donor not found.</p>;

    const handleChat = () => {
        updateItemStatus(item.itemId, ItemStatus.Reserved);
        setPage('chat', { item, otherUser: donor });
    };

    return (
        <div className="bg-white rounded-xl shadow-lg max-w-4xl mx-auto overflow-hidden">
            <div className="md:flex">
                <div className="md:flex-shrink-0">
                    <img src={item.imageUrl} alt={item.itemName} className="h-64 w-full object-cover md:h-full md:w-64" />
                </div>
                <div className="p-8 flex flex-col justify-between">
                    <div>
                        <div className="uppercase tracking-wide text-sm text-primary font-semibold">{item.category}</div>
                        <h1 className="block mt-1 text-3xl leading-tight font-bold text-black">{item.itemName}</h1>
                        <p className="mt-4 text-gray-600">{item.description}</p>
                        <div className="mt-6">
                            <p className="text-gray-500">Donated by:</p>
                            <p className="font-semibold text-dark">{donor.fullName}</p>
                        </div>
                    </div>
                    <div className="mt-8">
                        <button onClick={handleChat} className="w-full bg-secondary text-white px-6 py-3 rounded-lg font-semibold hover:bg-secondary-hover transition-colors flex items-center justify-center gap-2">
                            <ChatBubbleIcon className="w-6 h-6"/>
                            Chat with Donor to Arrange Pickup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ChatPage: React.FC<{ item: DonatedItem, otherUser: User }> = ({ item, otherUser }) => {
    const context = React.useContext(AppContext);
    if (!context || !context.currentUser) return null;
    
    const { currentUser, getChatThread, addMessageToThread, setPage } = context;

    const chatPartner = currentUser.userType === UserType.Donor ? otherUser : otherUser;
    const donorId = currentUser.userType === UserType.Donor ? currentUser.userId : otherUser.userId;
    const ngoId = currentUser.userType === UserType.NGO ? currentUser.userId : otherUser.userId;
    const threadId = createChatThreadId(donorId, ngoId, item.itemId);
    
    const messages = getChatThread(threadId);

    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    
    useEffect(() => {
        if(messages.length === 0 && currentUser.userType === UserType.NGO){
            const initialMessage = {
                senderId: currentUser.userId,
                text: `Hi ${otherUser.fullName}, I'm from ${currentUser.fullName} and I'm interested in the ${item.itemName} you posted.`
            };
            addMessageToThread(threadId, initialMessage);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const userMessage = { senderId: currentUser.userId, text: newMessage };
        addMessageToThread(threadId, userMessage);
        setNewMessage('');
        setIsLoading(true);

        // This must be called after the user message is added to the state
        // so it's included in the history for the AI.
        // We get the new history from the context after the update.
        const updatedHistory = [...messages, { ...userMessage, messageId: generateId(), timestamp: new Date() }];

        try {
            const replyFn = currentUser.userType === UserType.NGO ? getDonorReply : getNgoReply;
            const aiReplyText = await replyFn(updatedHistory, item);
            const aiMessage = {
                senderId: `ai-${otherUser.userId}`,
                text: aiReplyText
            };
            addMessageToThread(threadId, aiMessage);
        } catch (error) {
            console.error("AI reply failed:", error);
            addMessageToThread(threadId, {
                senderId: `ai-${otherUser.userId}`,
                text: "Sorry, an error occurred."
            });
        } finally {
            setIsLoading(false);
        }
    };

    const backButtonTarget = currentUser.userType === UserType.Donor ? 'donorDashboard' : 'ngoDashboard';

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] max-w-3xl mx-auto bg-white rounded-xl shadow-lg">
             <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-xl text-dark">Chat with {chatPartner.fullName}</h2>
                  <p className="text-sm text-gray-500">Regarding: {item.itemName}</p>
                </div>
                <button onClick={() => setPage(backButtonTarget)} className="text-sm text-primary font-semibold hover:underline">Back to Dashboard</button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
                {messages.map(msg => (
                    <div key={msg.messageId} className={`flex mb-4 ${msg.senderId === currentUser.userId ? 'justify-end' : 'justify-start'}`}>
                        <div className={`rounded-2xl py-2 px-4 max-w-sm ${msg.senderId === currentUser.userId ? 'bg-primary text-white rounded-br-none' : 'bg-gray-200 text-dark rounded-bl-none'}`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isLoading && (
                     <div className="flex justify-start mb-4">
                        <div className="rounded-2xl py-2 px-4 max-w-sm bg-gray-200 text-dark rounded-bl-none animate-pulse">
                            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-1 animate-bounce"></span>
                            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-1 animate-bounce delay-75"></span>
                            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t flex items-center gap-4">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type your message..." className="flex-1 p-3 border rounded-full focus:ring-2 focus:ring-primary focus:outline-none"/>
                <button type="submit" className="bg-secondary text-white rounded-full p-3 hover:bg-secondary-hover transition-colors disabled:bg-gray-300" disabled={isLoading || !newMessage}>
                    <SendIcon className="w-6 h-6"/>
                </button>
            </form>
        </div>
    );
};

// --- Main App Component ---
const App: React.FC = () => {
    // State management for data (simulating database)
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [items, setItems] = useState<DonatedItem[]>(initialItems);
    const [chats, setChats] = useState<ChatThreads>(initialChats);

    // State for auth and navigation
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [page, setPageState] = useState<Page>('login');
    const [pageContext, setPageContext] = useState<any>(null);

    const setPage = (newPage: Page, context: any = null) => {
        setPageState(newPage);
        setPageContext(context);
    };

    const login = useCallback((email: string) => {
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (user) {
            setCurrentUser(user);
            const targetDashboard = user.userType === UserType.Donor ? 'donorDashboard' : 'ngoDashboard';
            setPage(targetDashboard);
        } else {
            throw new Error("User not found. Please check the email or sign up.");
        }
    }, [users]);
    
    const addUser = useCallback((user: Omit<User, 'userId'>) => {
        if (users.some(u => u.email.toLowerCase() === user.email.toLowerCase())) {
            alert("An account with this email already exists.");
            return;
        }
        const newUser = { ...user, userId: generateId() };
        setUsers(prev => [...prev, newUser]);
        setCurrentUser(newUser); // Auto-login after signup
        const targetDashboard = newUser.userType === UserType.Donor ? 'donorDashboard' : 'ngoDashboard';
        setPage(targetDashboard);
    }, [users]);

    const logout = useCallback(() => {
        setCurrentUser(null);
        setPage('login');
    }, []);

    const addItem = useCallback((item: Omit<DonatedItem, 'itemId'>) => {
        const newItem = { ...item, itemId: generateId() };
        setItems(prev => [newItem, ...prev]);
    }, []);

    const updateItemStatus = useCallback((itemId: string, status: ItemStatus) => {
        setItems(prev => prev.map(item => item.itemId === itemId ? { ...item, status } : item));
    }, []);

    const findUserById = useCallback((userId: string) => users.find(u => u.userId === userId), [users]);
    
    const getChatThread = useCallback((threadId: string) => chats[threadId] || [], [chats]);

    const addMessageToThread = useCallback((threadId: string, message: Omit<ChatMessage, 'messageId' | 'timestamp'>) => {
        const newMessage: ChatMessage = { ...message, messageId: generateId(), timestamp: new Date() };
        setChats(prev => ({
            ...prev,
            [threadId]: [...(prev[threadId] || []), newMessage],
        }));
    }, []);

    const contextValue = useMemo(() => ({
        currentUser, login, logout, users, addUser, items, addItem, updateItemStatus, findUserById, getChatThread, addMessageToThread, setPage, chats
    }), [currentUser, login, logout, users, addUser, items, addItem, updateItemStatus, findUserById, getChatThread, addMessageToThread, chats]);

    const renderPage = () => {
        if (!currentUser) {
            switch(page) {
                case 'signup': return <SignUpPage setPage={setPage} addUser={addUser} />;
                default: return <LoginPage setPage={setPage} login={login} />;
            }
        }

        return (
            <>
              <AppHeader />
              <main className="container mx-auto p-6 bg-gray-50 min-h-[calc(100vh-68px)]">
                {page === 'donorDashboard' && <DonorDashboard />}
                {page === 'itemUpload' && <ItemUploadPage />}
                {page === 'ngoDashboard' && <NgoDashboard />}
                {page === 'itemDetail' && pageContext?.item && <ItemDetailPage item={pageContext.item} />}
                {page === 'chat' && pageContext?.item && pageContext?.otherUser && <ChatPage item={pageContext.item} otherUser={pageContext.otherUser} />}
              </main>
            </>
        );
    };

    return (
        <AppContext.Provider value={contextValue}>
            <div className="bg-gray-50">
              {renderPage()}
            </div>
        </AppContext.Provider>
    );
};

export default App;

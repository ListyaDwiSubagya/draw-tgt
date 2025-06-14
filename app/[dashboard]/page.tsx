import BoardCard, { BoardCardProps } from './_components/BoardCard';


export default function DashboardPage() {
  const teamBoards: BoardCardProps[] = [
    {
      id: 'new-board',
      type: 'new',
      title: 'New board',
      imageUrl: '', // Not used for 'new' type
    },
    {
      id: 'layering',
      type: 'existing',
      title: 'Layering',
      imageUrl: '/8.svg', // Sesuaikan path gambar Anda
    },
    {
      id: 'drawing-board',
      type: 'existing',
      title: 'Drawing board',
      imageUrl: '/9.svg', // Sesuaikan path gambar Anda
    },
    {
      id: 'app-wireframe',
      type: 'existing',
      title: 'App wireframe',
      imageUrl: '/2.svg', // Sesuaikan path gambar Anda
    },
    {
      id: 'team-meeting',
      type: 'existing',
      title: 'Team meeting',
      imageUrl: '/7.svg', // Sesuaikan path gambar Anda
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-semibold text-gray-800 mb-8">Team boards</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {teamBoards.map((board) => (
          <BoardCard key={board.id} {...board} />
          
        ))}
      </div>
    </div>
  );
}
"use client"

export const Participans = () => {
    return (
        <div className="absolute h-12 top-2 right-2 bg-white rounded-md p-3 flex
        items-center shadow-md gap-2">
            {/* Profile circles */}
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                A
            </div>
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-medium">
                B
            </div>
            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-medium">
                C
            </div>
        </div>
    )
}
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase";
import { API_ERROR } from "@/lib/api-errors";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
   try {
      const user = await getUserFromRequest(request);
      const { token, ranking } = (await request.json()) as {
         token?: string;
         ranking?: string[];
      };
      if (!token || !Array.isArray(ranking))
         return NextResponse.json({ error: API_ERROR.INVALID_VOTE }, { status: 400 });
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.rpc("submit_anonymous_ballot", {
         p_token: token,
         p_ranking: ranking,
         p_user_id: user?.id || null,
      });
      if (error) {
         const known = error.message.includes(
            "public room requires member account",
         )
            ? API_ERROR.MEMBER_ACCOUNT_REQUIRED
            : error.message.includes("voting closed")
              ? API_ERROR.VOTING_CLOSED
              : error.message.includes("account already participated")
                ? API_ERROR.ACCOUNT_ALREADY_PARTICIPATED
                : error.message.includes(
                       "invitation belongs to another account",
                    )
                  ? API_ERROR.INVITATION_OTHER_ACCOUNT
                  : error.message.includes("already voted")
                    ? API_ERROR.INVITATION_ALREADY_USED
                    : error.message.includes("invalid ranking")
                      ? API_ERROR.INVALID_RANKING
                      : API_ERROR.VOTE_SAVE_FAILED;
         return NextResponse.json({ error: known }, { status: 400 });
      }
      return NextResponse.json({ status: data });
   } catch {
      return NextResponse.json(
         { error: API_ERROR.INVALID_REQUEST },
         { status: 400 },
      );
   }
}

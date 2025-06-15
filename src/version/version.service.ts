import { Injectable } from '@nestjs/common';

const EXPO_GRAPHQL_QUERY = `
  query GetLatestUpdate($appId: String!, $channel: String!) {
    app {
      byId(appId: $appId) {
        updateChannelByName(name: $channel) {
          updateBranches(offset: 0, limit: 1) {
            updates(offset: 0, limit: 10) {
              id
              message
              runtimeVersion
              createdAt
              platform
            }
          }
        }
      }
    }
  }
`;

type UpdateInfo = {
  version: string;
  id: string;
  message: string;
  createdAt: string;
  platform: string;
};

@Injectable()
export class VersionService {
  constructor() {}

  async getVersion() {
    const expoToken = process.env.EXPO_TOKEN;
    const appId = process.env.EXPO_APP_ID;
    const channel = process.env.EXPO_CHANNEL ?? 'production';

    if (!expoToken || !appId) {
      return {
        ios: null,
        android: null,
        message: 'Expo 설정이 필요합니다. EXPO_TOKEN, EXPO_APP_ID를 확인해주세요.',
      };
    }

    const res = await fetch('https://api.expo.dev/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${expoToken}`,
      },
      body: JSON.stringify({
        query: EXPO_GRAPHQL_QUERY,
        variables: { appId, channel },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        ios: null,
        android: null,
        message: 'Expo API 호출에 실패했습니다.',
        error: data.errors?.[0]?.message ?? res.statusText,
      };
    }

    const updateChannel = data.data?.app?.byId?.updateChannelByName;
    const updateBranches = updateChannel?.updateBranches;
    const updates: Array<{ platform?: string; [key: string]: unknown }> =
      updateBranches?.[0]?.updates ?? [];

    const toUpdateInfo = (u: { platform?: string; [key: string]: unknown }): UpdateInfo => ({
      version: String(u.runtimeVersion ?? ''),
      id: String(u.id ?? ''),
      message: String(u.message ?? ''),
      createdAt: String(u.createdAt ?? ''),
      platform: String(u.platform ?? ''),
    });

    const latestIos = updates.find((u) => u.platform?.toLowerCase() === 'ios');
    const latestAndroid = updates.find((u) => u.platform?.toLowerCase() === 'android');

    return {
      ios: latestIos ? toUpdateInfo(latestIos) : null,
      android: latestAndroid ? toUpdateInfo(latestAndroid) : null,
    };
  }
}
